"use client";

import { useEffect, useMemo, useState } from 'react';
import { Clock3, FileUp, MessageSquare } from 'lucide-react';
import { useNavigate } from 'react-router-dom';
import { MapContainer, Marker, Popup, TileLayer, useMap } from 'react-leaflet';
import L from 'leaflet';
import 'leaflet/dist/leaflet.css';
import type { Lead } from '@/services/leadsService';
import { formatLeadStage, getLeadDeadline, resolveLeadStage } from '@/lib/fastTrackWorkflow';

interface LeadActionMapProps {
    leads: Lead[];
    now: number;
    actingLeadID?: string | null;
    canRequestDocuments?: (lead: Lead) => boolean;
    onRequestDocuments: (lead: Lead) => void;
    onScheduleViewing: (lead: Lead) => void;
    onOpenMessages: (lead: Lead) => void;
}

const createLeadMarkerIcon = (selected: boolean) => L.divIcon({
    className: 'lead-action-marker',
    html: `<div style="
        background:${selected ? '#f97316' : '#0f172a'};
        width:${selected ? 42 : 36}px;
        height:${selected ? 42 : 36}px;
        border-radius:999px;
        border:3px solid white;
        box-shadow:0 14px 28px rgba(15,23,42,0.28);
        display:flex;
        align-items:center;
        justify-content:center;
        color:white;
        font-weight:700;
        font-size:16px;
    ">&#9679;</div>`,
    iconSize: [selected ? 42 : 36, selected ? 42 : 36],
    iconAnchor: [selected ? 21 : 18, selected ? 42 : 36],
    popupAnchor: [0, selected ? -32 : -28],
});

const formatCountdown = (seconds: number) => {
    const minutes = Math.floor(seconds / 60);
    const remainder = seconds % 60;
    return `${minutes}:${remainder.toString().padStart(2, '0')}`;
};

const getLeadRemainingSeconds = (lead: Lead, now: number) => {
    if (typeof lead.sla_remaining_seconds === 'number') {
        return Math.max(0, lead.sla_remaining_seconds);
    }

    const deadline = getLeadDeadline(lead);
    if (!deadline) {
        return 0;
    }

    const remaining = Math.ceil((new Date(deadline).getTime() - now) / 1000);
    return remaining > 0 ? remaining : 0;
};

function LeadMapAutoFit({ leads }: { leads: Lead[] }) {
    const map = useMap();

    useEffect(() => {
        try {
            const points = leads
                .filter((lead) => typeof lead.property?.latitude === 'number' && typeof lead.property?.longitude === 'number')
                .map((lead) => [lead.property?.latitude as number, lead.property?.longitude as number] as [number, number]);

            map.closePopup();

            if (points.length === 0) {
                map.setView([54.5, -3], 5);
                return;
            }

            if (points.length === 1) {
                map.setView(points[0], 14);
                return;
            }

            map.fitBounds(L.latLngBounds(points), { padding: [44, 44], maxZoom: 15 });
        } catch {
            // Ignore transient Leaflet teardown errors during route or data changes.
        }
    }, [leads, map]);

    return null;
}

export default function LeadActionMap({
    leads,
    now,
    actingLeadID = null,
    canRequestDocuments,
    onRequestDocuments,
    onScheduleViewing,
    onOpenMessages,
}: LeadActionMapProps) {
    const navigate = useNavigate();
    const [selectedLeadID, setSelectedLeadID] = useState<string | null>(null);
    const [isMounted, setIsMounted] = useState(false);

    useEffect(() => {
        setIsMounted(true);
    }, []);

    const leadsWithCoordinates = useMemo(
        () => leads.filter((lead) => typeof lead.property?.latitude === 'number' && typeof lead.property?.longitude === 'number'),
        [leads],
    );

    useEffect(() => {
        if (!selectedLeadID && leadsWithCoordinates[0]) {
            setSelectedLeadID(leadsWithCoordinates[0].id);
            return;
        }

        if (selectedLeadID && !leadsWithCoordinates.some((lead) => lead.id === selectedLeadID)) {
            setSelectedLeadID(leadsWithCoordinates[0]?.id || null);
        }
    }, [leadsWithCoordinates, selectedLeadID]);

    const selectedLead = useMemo(
        () => leadsWithCoordinates.find((lead) => lead.id === selectedLeadID) || null,
        [leadsWithCoordinates, selectedLeadID],
    );
    const mapKey = useMemo(() => (
        leadsWithCoordinates.map((lead) => `${lead.id}:${lead.property?.latitude}:${lead.property?.longitude}`).join('|')
    ), [leadsWithCoordinates]);
    const resolveAssignedBrokerId = (lead: Lead) => lead.broker_id || lead.matched_broker_id || null;
    const canRequestDocumentsForLead = (lead: Lead) => (
        canRequestDocuments ? canRequestDocuments(lead) : Boolean(lead.user_id)
    );
    const canScheduleSelectedLead = Boolean(
        selectedLead?.user_id
        && selectedLead?.property_id
        && resolveAssignedBrokerId(selectedLead)
        && !['completed', 'expired', 'rejected', 'withdrawn'].includes(resolveLeadStage(selectedLead))
        && !['closed_won', 'closed_lost', 'cancelled'].includes(selectedLead?.status || ''),
    );
    const canRequestSelectedLead = selectedLead ? canRequestDocumentsForLead(selectedLead) : false;

    if (leadsWithCoordinates.length === 0) {
        return (
            <div className="rounded-3xl border border-dashed border-gray-200 bg-white p-6 shadow-sm dark:border-gray-800 dark:bg-black">
                <h3 className="text-lg font-semibold text-gray-900 dark:text-white">Lead map</h3>
                <p className="mt-2 text-sm text-gray-500 dark:text-gray-400">
                    Property markers will appear here automatically when lead properties have coordinates.
                </p>
            </div>
        );
    }

    return (
        <div className="overflow-hidden rounded-3xl border border-gray-100 bg-white shadow-sm dark:border-gray-800 dark:bg-black">
            <div className="flex items-center justify-between border-b border-gray-100 px-6 py-4 dark:border-gray-800">
                <div>
                    <h3 className="text-lg font-semibold text-gray-900 dark:text-white">Interactive lead map</h3>
                    <p className="mt-1 text-sm text-gray-500 dark:text-gray-400">
                        Live property markers stay connected to the same lead stage, client timer, and next action.
                    </p>
                </div>
                <div className="rounded-full bg-orange-50 px-3 py-1 text-xs font-semibold text-orange-700 dark:bg-orange-900/20 dark:text-orange-300">
                    User countdown stays live here
                </div>
            </div>

            <div className="grid gap-0 xl:grid-cols-[minmax(0,1fr)_320px]">
                <div className="relative h-[460px] bg-slate-100 dark:bg-slate-950">
                    {isMounted ? (
                        <MapContainer
                            key={mapKey}
                            center={[54.5, -3]}
                            zoom={6}
                            style={{ height: '100%', width: '100%' }}
                            scrollWheelZoom
                            fadeAnimation={false}
                            markerZoomAnimation={false}
                            zoomAnimation={false}
                        >
                            <LeadMapAutoFit leads={leadsWithCoordinates} />
                            <TileLayer
                                attribution='&copy; <a href="https://www.openstreetmap.org/copyright">OpenStreetMap</a> contributors'
                                url="https://{s}.tile.openstreetmap.org/{z}/{x}/{y}.png"
                            />
                            {leadsWithCoordinates.map((lead) => {
                                const stage = resolveLeadStage(lead);
                                const isSelected = selectedLeadID === lead.id;
                                const canRequestDocs = canRequestDocumentsForLead(lead);
                                const canScheduleViewing = Boolean(
                                    lead.user_id
                                    && lead.property_id
                                    && resolveAssignedBrokerId(lead)
                                    && !['completed', 'expired', 'rejected', 'withdrawn'].includes(stage)
                                    && !['closed_won', 'closed_lost', 'cancelled'].includes(lead.status || ''),
                                );

                                return (
                                    <Marker
                                        key={lead.id}
                                        position={[lead.property?.latitude as number, lead.property?.longitude as number]}
                                        icon={createLeadMarkerIcon(isSelected)}
                                        eventHandlers={{ click: () => setSelectedLeadID(lead.id) }}
                                    >
                                        <Popup>
                                            <div className="min-w-[240px] p-1">
                                                <p className="text-xs font-semibold uppercase tracking-[0.18em] text-gray-400">
                                                    {formatLeadStage(stage)}
                                                </p>
                                                <h4 className="mt-2 text-sm font-semibold text-slate-900">
                                                    {lead.property?.title || lead.property_name || 'Property enquiry'}
                                                </h4>
                                                <p className="mt-1 text-xs text-slate-500">
                                                    {[lead.property?.address_line_1, lead.property?.city, lead.property?.postcode].filter(Boolean).join(', ')}
                                                </p>
                                                <p className="mt-2 text-xs font-medium text-slate-700">
                                                    {lead.name || lead.email || 'Client enquiry'}
                                                </p>
                                                <p className="mt-1 text-xs text-slate-500">
                                                    Response timer: {formatCountdown(getLeadRemainingSeconds(lead, now))}
                                                </p>
                                                <div className="mt-3 grid gap-2">
                                                    <button
                                                        type="button"
                                                        onClick={() => onOpenMessages(lead)}
                                                        className="rounded-lg bg-orange-500 px-3 py-2 text-xs font-semibold text-white transition-colors hover:bg-orange-600"
                                                    >
                                                        Open messages
                                                    </button>
                                                    {canRequestDocs ? (
                                                        <button
                                                            type="button"
                                                            onClick={() => onRequestDocuments(lead)}
                                                            disabled={actingLeadID === lead.id}
                                                            className="rounded-lg border border-stone-200 px-3 py-2 text-xs font-semibold text-gray-900 transition-colors hover:border-orange-300 hover:bg-orange-50 disabled:cursor-not-allowed disabled:opacity-60"
                                                        >
                                                            {actingLeadID === lead.id ? 'Sending request...' : 'Request documents'}
                                                        </button>
                                                    ) : null}
                                                    {canScheduleViewing ? (
                                                        <button
                                                            type="button"
                                                            onClick={() => onScheduleViewing(lead)}
                                                            disabled={actingLeadID === lead.id}
                                                            className="rounded-lg border border-stone-200 px-3 py-2 text-xs font-semibold text-gray-900 transition-colors hover:border-orange-300 hover:bg-orange-50 disabled:cursor-not-allowed disabled:opacity-60"
                                                        >
                                                            Schedule viewing
                                                        </button>
                                                    ) : null}
                                                </div>
                                            </div>
                                        </Popup>
                                    </Marker>
                                );
                            })}
                        </MapContainer>
                    ) : (
                        <div className="flex h-full items-center justify-center text-sm font-medium text-gray-500 dark:text-gray-400">
                            Loading lead map...
                        </div>
                    )}

                    <div className="absolute left-4 top-4 z-[1000] rounded-xl bg-white/95 px-4 py-3 shadow-lg ring-1 ring-black/5 backdrop-blur-sm dark:bg-gray-900/90">
                        <p className="text-sm font-semibold text-gray-900 dark:text-gray-100">
                            {leadsWithCoordinates.length} lead{leadsWithCoordinates.length === 1 ? '' : 's'} on the map
                        </p>
                        <p className="mt-1 text-xs text-gray-500 dark:text-gray-400">
                            Click any marker to keep the live lead tools in sync.
                        </p>
                    </div>
                </div>

                {selectedLead ? (
                    <aside className="border-t border-gray-100 p-6 dark:border-gray-800 xl:border-l xl:border-t-0">
                        <p className="text-xs font-semibold uppercase tracking-[0.2em] text-gray-400">Selected lead</p>
                        <h4 className="mt-3 text-xl font-bold text-gray-900 dark:text-white">
                            {selectedLead.property?.title || selectedLead.property_name || 'Property enquiry'}
                        </h4>
                        <p className="mt-2 text-sm text-gray-500 dark:text-gray-400">
                            {[selectedLead.property?.address_line_1, selectedLead.property?.city, selectedLead.property?.postcode].filter(Boolean).join(', ')}
                        </p>

                        <div className="mt-5 grid gap-3">
                            <div className="rounded-2xl bg-gray-50 p-4 dark:bg-gray-900/60">
                                <p className="text-xs font-semibold uppercase tracking-[0.18em] text-gray-400">Stage</p>
                                <p className="mt-2 text-base font-semibold text-gray-900 dark:text-white">
                                    {formatLeadStage(resolveLeadStage(selectedLead))}
                                </p>
                            </div>
                            <div className="rounded-2xl bg-gray-50 p-4 dark:bg-gray-900/60">
                                <p className="text-xs font-semibold uppercase tracking-[0.18em] text-gray-400">Response timer</p>
                                <div className="mt-2 flex items-center gap-2 text-base font-semibold text-gray-900 dark:text-white">
                                    <Clock3 className="h-4 w-4 text-orange-500" />
                                    <span>{formatCountdown(getLeadRemainingSeconds(selectedLead, now))}</span>
                                </div>
                            </div>
                            <div className="rounded-2xl bg-gray-50 p-4 dark:bg-gray-900/60">
                                <p className="text-xs font-semibold uppercase tracking-[0.18em] text-gray-400">Client</p>
                                <p className="mt-2 text-base font-semibold text-gray-900 dark:text-white">
                                    {selectedLead.name || selectedLead.email || 'Client enquiry'}
                                </p>
                                <p className="mt-1 text-sm text-gray-500 dark:text-gray-400">
                                    {selectedLead.email || selectedLead.phone || 'Contact details pending'}
                                </p>
                            </div>
                        </div>

                        <div className="mt-5 space-y-3">
                            <button
                                type="button"
                                onClick={() => onOpenMessages(selectedLead)}
                                className="flex w-full items-center justify-center gap-2 rounded-2xl bg-orange-500 px-4 py-3 text-sm font-semibold text-white transition hover:bg-orange-600"
                            >
                                <MessageSquare className="h-4 w-4" />
                                Open messages
                            </button>
                            {canRequestSelectedLead ? (
                                <button
                                    type="button"
                                    onClick={() => onRequestDocuments(selectedLead)}
                                    disabled={actingLeadID === selectedLead.id}
                                    className="flex w-full items-center justify-center gap-2 rounded-2xl border border-gray-200 px-4 py-3 text-sm font-semibold text-gray-700 transition hover:bg-gray-50 disabled:cursor-not-allowed disabled:opacity-60 dark:border-gray-700 dark:text-gray-200 dark:hover:bg-gray-900"
                                >
                                    <FileUp className="h-4 w-4" />
                                    {actingLeadID === selectedLead.id ? 'Sending request...' : 'Request documents'}
                                </button>
                            ) : null}
                            {canScheduleSelectedLead ? (
                                <button
                                    type="button"
                                    onClick={() => onScheduleViewing(selectedLead)}
                                    disabled={actingLeadID === selectedLead.id}
                                    className="w-full rounded-2xl border border-gray-200 px-4 py-3 text-sm font-semibold text-gray-700 transition hover:bg-gray-50 disabled:cursor-not-allowed disabled:opacity-60 dark:border-gray-700 dark:text-gray-200 dark:hover:bg-gray-900"
                                >
                                    Schedule viewing
                                </button>
                            ) : null}
                            {selectedLead.property_id ? (
                                <button
                                    type="button"
                                    onClick={() => navigate(`/manager/dashboard/properties/${selectedLead.property_id}`)}
                                    className="w-full rounded-2xl border border-gray-200 px-4 py-3 text-sm font-semibold text-gray-700 transition hover:bg-gray-50 dark:border-gray-700 dark:text-gray-200 dark:hover:bg-gray-900"
                                >
                                    Open property
                                </button>
                            ) : null}
                        </div>
                    </aside>
                ) : null}
            </div>
        </div>
    );
}
