"use client";

import { useEffect, useMemo, useState } from 'react';
import { Clock3, FileUp, MapPin, MessageSquare } from 'lucide-react';
import { useNavigate } from 'react-router-dom';
import type { Lead } from '@/services/leadsService';
import { formatLeadStage, getLeadDeadline, resolveLeadStage } from '@/lib/fastTrackWorkflow';

interface LeadActionMapProps {
    leads: Lead[];
    now: number;
    actingLeadID?: string | null;
    onRequestDocuments: (lead: Lead) => void;
    onOpenMessages: (lead: Lead) => void;
}

interface MapBounds {
    minLat: number;
    maxLat: number;
    minLng: number;
    maxLng: number;
}

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

const buildPosition = (latitude: number, longitude: number, bounds: MapBounds) => {
    const latRange = bounds.maxLat - bounds.minLat || 0.1;
    const lngRange = bounds.maxLng - bounds.minLng || 0.1;

    return {
        left: `${Math.max(8, Math.min(92, ((longitude - bounds.minLng) / lngRange) * 100))}%`,
        top: `${Math.max(10, Math.min(90, ((bounds.maxLat - latitude) / latRange) * 100))}%`,
    };
};

export default function LeadActionMap({
    leads,
    now,
    actingLeadID = null,
    onRequestDocuments,
    onOpenMessages,
}: LeadActionMapProps) {
    const navigate = useNavigate();
    const [selectedLeadID, setSelectedLeadID] = useState<string | null>(null);

    const leadsWithCoordinates = useMemo(
        () => leads.filter((lead) => typeof lead.property?.latitude === 'number' && typeof lead.property?.longitude === 'number'),
        [leads],
    );

    const mapBounds = useMemo<MapBounds | null>(() => {
        if (leadsWithCoordinates.length === 0) {
            return null;
        }

        const latitudes = leadsWithCoordinates.map((lead) => lead.property?.latitude as number);
        const longitudes = leadsWithCoordinates.map((lead) => lead.property?.longitude as number);

        return {
            minLat: Math.min(...latitudes),
            maxLat: Math.max(...latitudes),
            minLng: Math.min(...longitudes),
            maxLng: Math.max(...longitudes),
        };
    }, [leadsWithCoordinates]);

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

    if (!mapBounds || leadsWithCoordinates.length === 0) {
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
                        See the current lead stage and trigger follow-up from the property marker itself.
                    </p>
                </div>
                <div className="rounded-full bg-orange-50 px-3 py-1 text-xs font-semibold text-orange-700 dark:bg-orange-900/20 dark:text-orange-300">
                    10-minute live response
                </div>
            </div>

            <div className="grid gap-0 xl:grid-cols-[minmax(0,1fr)_320px]">
                <div className="relative h-[460px] bg-[radial-gradient(circle_at_top,_rgba(251,191,36,0.22),_transparent_40%),linear-gradient(180deg,_#f8fafc,_#e2e8f0)] dark:bg-[radial-gradient(circle_at_top,_rgba(249,115,22,0.18),_transparent_42%),linear-gradient(180deg,_#111827,_#020617)]">
                    <iframe
                        title="Lead property map"
                        className="absolute inset-0 h-full w-full opacity-45"
                        src={`https://www.google.com/maps/embed?pb=!1m14!1m12!1m3!1d${28000}!2d${(mapBounds.minLng + mapBounds.maxLng) / 2}!3d${(mapBounds.minLat + mapBounds.maxLat) / 2}!2m3!1f0!2f0!3f0!3m2!1i1024!2i768!4f13.1!5e0!3m2!1sen!2suk!4v1640000000000!5m2!1sen!2suk`}
                        loading="lazy"
                        referrerPolicy="no-referrer-when-downgrade"
                    />

                    <div className="absolute inset-0">
                        {leadsWithCoordinates.map((lead) => {
                            const position = buildPosition(
                                lead.property?.latitude as number,
                                lead.property?.longitude as number,
                                mapBounds,
                            );
                            const stage = resolveLeadStage(lead);
                            const isSelected = selectedLeadID === lead.id;

                            return (
                                <button
                                    key={lead.id}
                                    type="button"
                                    onClick={() => setSelectedLeadID(lead.id)}
                                    className="absolute -translate-x-1/2 -translate-y-1/2"
                                    style={position}
                                >
                                    <span className={`flex h-12 w-12 items-center justify-center rounded-full border-4 border-white shadow-xl transition ${isSelected ? 'bg-orange-500 text-white scale-110' : 'bg-slate-900 text-white hover:scale-105 dark:bg-slate-100 dark:text-slate-900'}`}>
                                        <MapPin className="h-5 w-5" />
                                    </span>
                                    <span className="mt-2 inline-flex rounded-full bg-white/90 px-2 py-1 text-[11px] font-semibold text-slate-700 shadow-md dark:bg-black/80 dark:text-slate-200">
                                        {formatLeadStage(stage)}
                                    </span>
                                </button>
                            );
                        })}
                    </div>
                </div>

                {selectedLead && (
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
                                <p className="mt-2 text-base font-semibold text-gray-900 dark:text-white">{formatLeadStage(resolveLeadStage(selectedLead))}</p>
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
                                <p className="mt-2 text-base font-semibold text-gray-900 dark:text-white">{selectedLead.name || selectedLead.email || 'Client enquiry'}</p>
                                <p className="mt-1 text-sm text-gray-500 dark:text-gray-400">{selectedLead.email || selectedLead.phone || 'Contact details pending'}</p>
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
                            <button
                                type="button"
                                onClick={() => onRequestDocuments(selectedLead)}
                                disabled={actingLeadID === selectedLead.id || !selectedLead.user_id}
                                className="flex w-full items-center justify-center gap-2 rounded-2xl border border-gray-200 px-4 py-3 text-sm font-semibold text-gray-700 transition hover:bg-gray-50 disabled:cursor-not-allowed disabled:opacity-60 dark:border-gray-700 dark:text-gray-200 dark:hover:bg-gray-900"
                            >
                                <FileUp className="h-4 w-4" />
                                {actingLeadID === selectedLead.id ? 'Sending request...' : 'Request documents'}
                            </button>
                            {selectedLead.property_id && (
                                <button
                                    type="button"
                                    onClick={() => navigate(`/manager/dashboard/properties/${selectedLead.property_id}`)}
                                    className="w-full rounded-2xl border border-gray-200 px-4 py-3 text-sm font-semibold text-gray-700 transition hover:bg-gray-50 dark:border-gray-700 dark:text-gray-200 dark:hover:bg-gray-900"
                                >
                                    Open property
                                </button>
                            )}
                        </div>
                    </aside>
                )}
            </div>
        </div>
    );
}
