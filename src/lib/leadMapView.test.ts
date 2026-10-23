import assert from 'node:assert/strict';
import test from 'node:test';

import type { Lead } from '@/services/leadsService';
import { formatLeadResponseTimer, getLeadMapActions, getLeadMapSwitcherLabels, groupLeadsByLocation } from './leadMapView';

const lead = (id: string, latitude?: number, longitude?: number): Lead => ({
    id,
    status: 'broker_responded',
    created_at: '2026-08-18T00:00:00Z',
    updated_at: '2026-08-18T00:00:00Z',
    property: {
        id: `property-${id}`,
        title: 'Harbour View',
        address_line_1: 'Quay',
        city: 'Bristol',
        price: 1000,
        image_urls: '',
        property_type: 'flat',
        agent_name: 'Manager',
        latitude,
        longitude,
    },
});

test('#713 leads sharing coordinates collapse into one reachable marker group', () => {
    const groups = groupLeadsByLocation([
        lead('a', 51.45, -2.59),
        lead('b', 51.45, -2.59),
        lead('c', 51.5, -2.6),
        lead('no-location'),
    ]);

    assert.equal(groups.length, 2);
    assert.deepEqual(groups[0].leads.map((item) => item.id), ['a', 'b']);
    assert.deepEqual(groups[0].coordinates, [51.45, -2.59]);
    assert.deepEqual(groups[1].leads.map((item) => item.id), ['c']);
});

test('#713 leads without verified coordinates are not grouped', () => {
    assert.deepEqual(groupLeadsByLocation([lead('x')]), []);
});

test('#720 popup and panel share one action list, including Open property', () => {
    const all = getLeadMapActions({ canRequestDocuments: true, canSchedule: true, hasProperty: true });
    assert.deepEqual(all.map((action) => action.id), ['messages', 'documents', 'viewing', 'property']);
    assert.deepEqual(all.map((action) => action.label), [
        'Open messages',
        'Request documents',
        'Schedule viewing',
        'Open property',
    ]);

    const minimal = getLeadMapActions({ canRequestDocuments: false, canSchedule: false, hasProperty: false });
    assert.deepEqual(minimal.map((action) => action.id), ['messages']);
});

test('switcher labels add the property when two leads share a client', () => {
    const leads = [
        { id: 'a', name: 'Maya Demo', property: { title: 'Garden Court' } },
        { id: 'b', name: 'Maya Demo', property_name: 'Harbour View' },
        { id: 'c', name: 'Ravi', property: { title: 'Lake Road' } },
    ] as unknown as Lead[];
    assert.deepEqual(getLeadMapSwitcherLabels(leads), ['Maya Demo · Garden Court', 'Maya Demo · Harbour View', 'Ravi']);
});

test('a manual lead has no response timer; a routed lead counts down', () => {
    const manual = { id: 'm1', source: 'manual', sla_remaining_seconds: 76607 } as unknown as Lead;
    assert.equal(formatLeadResponseTimer(manual, Date.now()), 'Not timed (manual lead)');
    const routed = { id: 'r1', source: 'broker_request', sla_remaining_seconds: 425 } as unknown as Lead;
    assert.equal(formatLeadResponseTimer(routed, Date.now()), '7:05');
    assert.equal(formatLeadResponseTimer({ id: 'r2', sla_remaining_seconds: -5 } as unknown as Lead, Date.now()), '0:00');
});
