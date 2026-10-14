"use client";

import { useEffect, useMemo, useRef, useState } from 'react';
import { Clock3, FileUp, MessageSquare } from 'lucide-react';
import { useNavigate } from 'react-router-dom';
import { MapContainer, Marker, Popup, TileLayer, useMap } from '@/lib/leafletReact';
import L from 'leaflet';
import 'leaflet/dist/leaflet.css';
import type { Lead } from '@/services/leadsService';
import { formatLeadStage, resolveLeadStage } from '@/lib/fastTrackWorkflow';
import { getLeadMapCoordinates } from '@/lib/leadMap';
import { formatLeadResponseTimer, getLeadMapActions, getLeadMapSwitcherLabels, groupLeadsByLocation, type LeadMapActionId } from '@/lib/leadMapView';
import { canScheduleManagerLeadViewing, formatManagerLeadAddress, pickDefaultManagerLead } from '@/lib/managerLeadList';

import BrandLoadingScreen from '@/components/ui/BrandLoadingScreen';

interface LeadActionMapProps {
    leads: Lead[];
    now: number;
    actingLeadID?: string | null;
    canRequestDocuments?: (lead: Lead) => boolean;
    onRequestDocuments: (lead: Lead) => void;
    onScheduleViewing: (lead: Lead) => void;
    onOpenMessages: (lead: Lead) => void;
    /** Lead named by a notification deep link (?lead=), selected instead of the newest lead (MB-0583, MB-0968). */
    requestedLeadId?: string | null;
}

// Compact popup that pans into view and opens above its marker instead of covering it (#714).
const LEAD_POPUP_OPTIONS: L.PopupOptions = {
    className: 'lead-map-popup',
    maxWidth: 260,
    minWidth: 220,
    maxHeight: 240,
    autoPan: true,
    autoPanPaddingTopLeft: [16, 72],
    autoPanPaddingBottomRight: [16, 16],
};

const createLeadMarkerIcon = (selected: boolean, count = 1) => {
    const size = selected ? 42 : 36;
    const badge = count > 1
        ? `<span style="position:absolute;top:-8px;right:-8px;min-width:20px;height:20px;padding:0 5px;box-sizing:border-box;border-radius:999px;background:#ffffff;color:#0f172a;border:2px solid #0f172a;font-size:12px;font-weight:700;line-height:16px;text-align:center;">${count}</span>`
        : '';
    return L.divIcon({
        className: 'lead-action-marker',
        html: `<div style="
        position:relative;
        background:${selected ? '#f97316' : '#0f172a'};
        width:${size}px;
        height:${size}px;
        border-radius:999px;
        border:3px solid white;
        box-shadow:0 14px 28px rgba(15,23,42,0.28);
        display:flex;
        align-items:center;
        justify-content:center;
        color:white;
        font-weight:700;
        font-size:16px;
    ">&#9679;${badge}</div>`,
        iconSize: [size, size],
        iconAnchor: [size / 2, size],
        popupAnchor: [0, -(size + 6)],
    });
};

function LeadMapAutoFit({ leads, locationKey }: { leads: Lead[]; locationKey: string }) {
    const map = useMap();
    const appliedLocationKey = useRef<string | null>(null);

    useEffect(() => {
        if (appliedLocationKey.current === locationKey) {
            return;
        }

        try {
            appliedLocationKey.current = locationKey;
            const points = leads
                .map(getLeadMapCoordinates)
                .filter((coordinates): coordinates is [number, number] => coordinates !== null);

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
    }, [leads, locationKey, map]);

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
    requestedLeadId = null,
}: LeadActionMapProps) {
    const navigate = useNavigate();
    const [selectedLeadID, setSelectedLeadID] = useState<string | null>(requestedLeadId);
    useEffect(() => {
        if (requestedLeadId) {
            setSelectedLeadID(requestedLeadId);
        }
    }, [requestedLeadId]);
    const [isMounted, setIsMounted] = useState(false);

    useEffect(() => {
        setIsMounted(true);
    }, []);

    const leadsWithCoordinates = useMemo(
        () => leads.filter((lead) => getLeadMapCoordinates(lead) !== null),
        [leads],
    );

    // Until the manager clicks a marker, follow the newest live lead so its countdown stays visible.
    // Live broker requests have no verified location yet, so selection covers every lead, not only markers.
    const selectedLead = leads.find((lead) => lead.id === selectedLeadID)
        || pickDefaultManagerLead(leads, now);
    const selectedLeadIsOnMap = Boolean(selectedLead && getLeadMapCoordinates(selectedLead));
    const mapLocationKey = useMemo(() => (
        leadsWithCoordinates
            .map((lead) => `${lead.id}:${getLeadMapCoordinates(lead)?.join(':')}`)
            .sort()
            .join('|')
    ), [leadsWithCoordinates]);
    const leadGroups = useMemo(() => groupLeadsByLocation(leadsWithCoordinates), [leadsWithCoordinates]);
    const uniqueLocationCount = leadGroups.length;
    const canRequestDocumentsForLead = (lead: Lead) => (
        canRequestDocuments ? canRequestDocuments(lead) : Boolean(lead.user_id)
    );
    const runLeadAction = (id: LeadMapActionId, lead: Lead) => {
        if (id === 'messages') onOpenMessages(lead);
        else if (id === 'documents') onRequestDocuments(lead);
        else if (id === 'viewing') onScheduleViewing(lead);
        else navigate(`/manager/dashboard/properties/${lead.property_id}`);
    };
    // One action list drives both the marker popup and the Selected lead panel (#720).
    const renderLeadActions = (lead: Lead, variant: 'popup' | 'panel') => getLeadMapActions({
        canRequestDocuments: canRequestDocumentsForLead(lead),
        canSchedule: canScheduleManagerLeadViewing(lead),
        hasProperty: Boolean(lead.property_id),
    }).map((action) => {
        const primary = action.id === 'messages';
        const busy = actingLeadID === lead.id && (action.id === 'documents' || action.id === 'viewing');
        const label = busy && action.id === 'documents' ? 'Sending request...' : action.label;
        const className = variant === 'popup'
            ? `rounded-lg px-3 py-2 text-xs font-semibold transition-colors disabled:cursor-not-allowed disabled:opacity-60 ${primary ? 'bg-orange-500 text-white hover:bg-orange-600' : 'border border-stone-200 text-gray-900 hover:border-orange-300 hover:bg-orange-50'}`
            : `flex w-full items-center justify-center gap-2 rounded-2xl px-4 py-3 text-sm font-semibold transition disabled:cursor-not-allowed disabled:opacity-60 ${primary ? 'bg-orange-500 text-white hover:bg-orange-600' : 'border border-gray-200 text-gray-700 hover:bg-gray-50 dark:border-gray-700 dark:text-gray-200 dark:hover:bg-gray-900'}`;
        return (
            <button
                key={action.id}
                type="button"
                onClick={() => runLeadAction(action.id, lead)}
                disabled={busy}
                className={className}
            >
                {variant === 'panel' && action.id === 'messages' ? <MessageSquare className="h-4 w-4" /> : null}
                {variant === 'panel' && action.id === 'documents' ? <FileUp className="h-4 w-4" /> : null}
                {label}
            </button>
        );
    });

    if (leads.length === 0) {
        return null;
    }

    const initialMapCenter = leadsWithCoordinates[0] ? getLeadMapCoordinates(leadsWithCoordinates[0]) : null;

    return (
        <div className="scroll-mt-[calc(var(--workspace-header-height,4rem)+0.75rem)] overflow-hidden rounded-3xl border border-gray-100 bg-white shadow-sm dark:border-gray-800 dark:bg-black">
            <div className="flex flex-col gap-3 border-b border-gray-100 px-4 py-4 dark:border-gray-800 sm:flex-row sm:items-center sm:justify-between sm:px-6">
                <div>
                    <h3 className="text-lg font-semibold text-gray-900 dark:text-white">Interactive lead map</h3>
                    <p className="mt-1 text-sm text-gray-500 dark:text-gray-400">
                        Live property markers stay connected to the same lead stage, client timer, and next action.
                    </p>
                </div>
                <div className="w-fit shrink-0 rounded-full bg-orange-50 px-3 py-1 text-xs font-semibold text-orange-700 dark:bg-orange-900/20 dark:text-orange-300">
                    User countdown stays live here
                </div>
            </div>

            <div className="grid gap-0 xl:grid-cols-[minmax(0,1fr)_320px]">
                <div className="relative isolate h-[460px] bg-slate-100 dark:bg-slate-950">
                    {!initialMapCenter ? (
                        <div className="flex h-full flex-col items-center justify-center px-6 text-center">
                            <p className="text-base font-semibold text-gray-900 dark:text-white">No verified lead locations</p>
                            <p className="mt-2 max-w-sm text-sm text-gray-500 dark:text-gray-400">
                                These leads do not have verified coordinates yet, so they are not placed at an approximate or incorrect location.
                            </p>
                        </div>
                    ) : isMounted ? (
                        <MapContainer
                            key={mapLocationKey}
                            center={initialMapCenter}
                            zoom={6}
                            minZoom={2}
                            maxBounds={[[-85, -180], [85, 180]]}
                            maxBoundsViscosity={1}
                            worldCopyJump
                            style={{ height: '100%', width: '100%' }}
                            scrollWheelZoom={false}
                            fadeAnimation={false}
                            markerZoomAnimation={false}
                            zoomAnimation={false}
                        >
                            <LeadMapAutoFit leads={leadsWithCoordinates} locationKey={mapLocationKey} />
                            <TileLayer
                                attribution='&copy; <a href="https://www.openstreetmap.org/copyright">OpenStreetMap</a> contributors'
                                url="https://{s}.tile.openstreetmap.org/{z}/{x}/{y}.png"
                                noWrap
                            />
                            {leadGroups.map((group) => {
                                const activeLead = group.leads.find((lead) => lead.id === selectedLead?.id) || group.leads[0];
                                const stage = resolveLeadStage(activeLead);
                                const isSelected = selectedLead?.id === activeLead.id;

                                return (
                                    <Marker
                                        key={group.key}
                                        position={group.coordinates}
                                        icon={createLeadMarkerIcon(isSelected, group.leads.length)}
                                        title={group.leads.length > 1
                                            ? `${group.leads.length} leads at this location`
                                            : `${activeLead.lead_number || activeLead.id} ${activeLead.property?.title || activeLead.property_name || 'property enquiry'} ${formatLeadStage(stage)}`}
                                        alt={`${group.leads.length > 1 ? `${group.leads.length} leads` : activeLead.lead_number || activeLead.id} map marker`}
                                        keyboard
                                        eventHandlers={{ click: () => setSelectedLeadID(activeLead.id) }}
                                    >
                                        <Popup options={LEAD_POPUP_OPTIONS}>
                                            <div className="w-[220px] max-w-full">
                                                {group.leads.length > 1 ? (
                                                    <div role="group" aria-label={`${group.leads.length} leads at this location`} className="mb-2 flex flex-wrap gap-1 pr-11">
                                                        {group.leads.map((lead, leadIndex) => (
                                                            <button
                                                                key={lead.id}
                                                                type="button"
                                                                aria-pressed={lead.id === activeLead.id}
                                                                onClick={() => setSelectedLeadID(lead.id)}
                                                                className={`rounded-full border px-2 py-1 text-xs font-semibold ${lead.id === activeLead.id ? 'border-orange-600 bg-orange-600 text-white' : 'border-stone-300 bg-white text-slate-700'}`}
                                                            >
                                                                {getLeadMapSwitcherLabels(group.leads)[leadIndex]}
                                                            </button>
                                                        ))}
                                                    </div>
                                                ) : null}
                                                <p className={`text-xs font-semibold uppercase tracking-[0.18em] text-slate-600 ${group.leads.length > 1 ? '' : 'pr-11'}`}>
                                                    {formatLeadStage(stage)}
                                                </p>
                                                <h4 className="mt-1 text-sm font-semibold text-slate-900">
                                                    {activeLead.property?.title || activeLead.property_name || 'Property enquiry'}
                                                </h4>
                                                <p className="mt-1 text-xs text-slate-600">
                                                    {formatManagerLeadAddress(activeLead.property)}
                                                </p>
                                                <p className="mt-1 text-xs font-medium text-slate-800">
                                                    {activeLead.name || activeLead.email || 'Client enquiry'}
                                                </p>
                                                <p className="mt-1 text-xs text-slate-600">
                                                    Response timer: {formatLeadResponseTimer(activeLead, now)}
                                                </p>
                                                <div className="mt-2 grid gap-2">
                                                    {renderLeadActions(activeLead, 'popup')}
                                                </div>
                                            </div>
                                        </Popup>
                                    </Marker>
                                );
                            })}
                        </MapContainer>
                    ) : (
                        <div className="flex h-full items-center justify-center text-gray-500 dark:text-gray-400">
                            <BrandLoadingScreen variant="panel" label="Loading lead map..." />
                        </div>
                    )}

                    {initialMapCenter ? (
                        <div className="absolute left-14 top-3 z-[1000] max-w-[calc(100%-4.5rem)] rounded-xl bg-white/95 px-4 py-3 shadow-lg ring-1 ring-black/5 backdrop-blur-sm dark:bg-gray-900/90">
                            <p className="text-sm font-semibold text-gray-900 dark:text-gray-100">
                                {leadsWithCoordinates.length} lead{leadsWithCoordinates.length === 1 ? '' : 's'} on the map
                            </p>
                            <p className="mt-1 text-xs text-gray-500 dark:text-gray-400">
                                Across {uniqueLocationCount} verified location{uniqueLocationCount === 1 ? '' : 's'}. Click a marker to keep the live lead tools in sync.
                            </p>
                        </div>
                    ) : null}
                </div>

                {selectedLead ? (
                    <aside className="border-t border-gray-100 p-6 dark:border-gray-800 xl:border-l xl:border-t-0">
                        <p className="text-xs font-semibold uppercase tracking-[0.2em] text-gray-400">Selected lead</p>
                        <h4 className="mt-3 text-xl font-bold text-gray-900 dark:text-white">
                            {selectedLead.property?.title || selectedLead.property_name || 'Property enquiry'}
                        </h4>
                        <p className="mt-2 text-sm text-gray-500 dark:text-gray-400">
                            {formatManagerLeadAddress(selectedLead.property)}
                        </p>
                        {!selectedLeadIsOnMap ? (
                            <p className="mt-2 text-xs text-gray-500 dark:text-gray-400">
                                Not on the map yet: this lead has no verified location.
                            </p>
                        ) : null}

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
                                    <span>{formatLeadResponseTimer(selectedLead, now)}</span>
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
                            {renderLeadActions(selectedLead, 'panel')}
                        </div>
                    </aside>
                ) : null}
            </div>
        </div>
    );
}
