import assert from 'node:assert/strict';
import { test } from 'node:test';

import {
    formatPropertyFloorCaption,
    formatPropertyInventoryCaption,
    type PropertyFloorCaptionInput,
} from './propertyStatusBadge';

const floorCaptionCases: Array<{ name: string; input: PropertyFloorCaptionInput; expected: string | null }> = [
    // Single-unit residential listings show their place in the building.
    { name: 'apartment on floor 3 of a 6-floor building', input: { property_type: 'apartment', floor_number: 3, total_floors: 6 }, expected: 'Floor 3 of 6' },
    { name: 'apartment from the property context shape', input: { propertyType: 'apartment', dimensions: { floorNumber: 3, totalFloors: 6, occupiedUnits: 0 } }, expected: 'Floor 3 of 6' },
    { name: 'apartment ignores occupied units', input: { property_type: 'apartment', floor_number: 2, total_floors: 6, occupied_units: 4 }, expected: 'Floor 2 of 6' },
    { name: 'flat on the top floor', input: { property_type: 'Flat', floor_number: 12, total_floors: 12 }, expected: 'Floor 12 of 12' },
    { name: 'condo with trimmed mixed-case type', input: { property_type: '  Condo ', floor_number: 5, total_floors: 20 }, expected: 'Floor 5 of 20' },
    { name: 'studio', input: { property_type: 'studio', floor_number: 1, total_floors: 4 }, expected: 'Floor 1 of 4' },
    { name: 'penthouse', input: { property_type: 'penthouse', floor_number: 30, total_floors: 30 }, expected: 'Floor 30 of 30' },
    { name: 'duplex with only total floors', input: { property_type: 'duplex', total_floors: 2 }, expected: '2-floor building' },
    { name: 'townhouse with only total floors', input: { property_type: 'townhouse', total_floors: 3 }, expected: '3-floor building' },
    { name: 'villa with only total floors', input: { property_type: 'villa', total_floors: 2 }, expected: '2-floor building' },
    // Core sends floor_number 0 only for a real ground floor and null when the
    // manager did not provide a floor.
    { name: 'house on floor 0 is the ground floor', input: { property_type: 'house', floor_number: 0, total_floors: 2 }, expected: 'Ground floor of 2' },
    { name: 'apartment on floor 0 is the ground floor', input: { property_type: 'apartment', floor_number: 0, total_floors: 6 }, expected: 'Ground floor of 6' },
    { name: 'apartment with a null floor (not provided) uses the building caption', input: { property_type: 'apartment', floor_number: null, total_floors: 6 }, expected: '6-floor building' },
    { name: 'apartment with no floor field uses the building caption', input: { property_type: 'apartment', total_floors: 6 }, expected: '6-floor building' },
    { name: 'apartment ground floor from the property context shape', input: { propertyType: 'apartment', dimensions: { floorNumber: 0, totalFloors: 6, occupiedUnits: 0 } }, expected: 'Ground floor of 6' },
    { name: 'apartment null floor from the property context shape uses the building caption', input: { propertyType: 'apartment', dimensions: { floorNumber: null, totalFloors: 6, occupiedUnits: 0 } }, expected: '6-floor building' },
    { name: 'context null floor falls back to the API floor_number', input: { propertyType: 'apartment', floor_number: 2, dimensions: { floorNumber: null, totalFloors: 6 } }, expected: 'Floor 2 of 6' },
    { name: 'ground floor of a single-storey building shows nothing', input: { property_type: 'apartment', floor_number: 0, total_floors: 1 }, expected: null },
    { name: 'negative floor uses the building caption', input: { property_type: 'apartment', floor_number: -1, total_floors: 6 }, expected: '6-floor building' },
    { name: 'fractional floor is truncated', input: { property_type: 'apartment', floor_number: 2.9, total_floors: 6 }, expected: 'Floor 2 of 6' },
    { name: 'commercial floor 0 keeps the occupancy caption', input: { property_type: 'commercial', floor_number: 0, total_floors: 6, occupied_units: 2 }, expected: '2 of 6 floors occupied' },
    { name: 'land floor 0 shows nothing', input: { property_type: 'land', floor_number: 0, total_floors: 3 }, expected: null },
    { name: 'triplex is single-unit', input: { property_type: 'triplex', total_floors: 3 }, expected: '3-floor building' },
    { name: 'missing type defaults to single-unit', input: { floor_number: 3, total_floors: 6 }, expected: 'Floor 3 of 6' },
    { name: 'floor above total falls back to the building caption', input: { property_type: 'apartment', floor_number: 9, total_floors: 6 }, expected: '6-floor building' },
    { name: 'single-storey total shows nothing', input: { property_type: 'apartment', floor_number: 1, total_floors: 1 }, expected: null },
    { name: 'no floor data shows nothing', input: { property_type: 'apartment' }, expected: null },
    { name: 'non-finite values show nothing', input: { property_type: 'apartment', floor_number: Number.NaN, total_floors: Number.POSITIVE_INFINITY }, expected: null },

    // Whole-building commercial listings keep the occupancy model exactly.
    { name: 'commercial building with no occupancy', input: { property_type: 'commercial', total_floors: 6, occupied_units: 0 }, expected: '6 floors available' },
    { name: 'office building partly occupied', input: { property_type: 'office', total_floors: 6, occupied_units: 2 }, expected: '2 of 6 floors occupied' },
    { name: 'industrial building fully occupied', input: { property_type: 'industrial', total_floors: 4, occupied_units: 4 }, expected: 'Fully occupied across 4 floors' },
    { name: 'commercial ignores floor number', input: { propertyType: 'Commercial', dimensions: { floorNumber: 3, totalFloors: 6, occupiedUnits: 1 } }, expected: '1 of 6 floors occupied' },
    { name: 'single-floor office shows nothing', input: { property_type: 'office', total_floors: 1, occupied_units: 0 }, expected: null },

    // Land has no floors.
    { name: 'land never shows a floor caption', input: { property_type: 'land', floor_number: 1, total_floors: 3 }, expected: null },
];

for (const { name, input, expected } of floorCaptionCases) {
    test(`formatPropertyFloorCaption: ${name}`, () => {
        assert.equal(formatPropertyFloorCaption(input), expected);
    });
}

test('formatPropertyInventoryCaption keeps the whole-building occupancy wording', () => {
    const cases: Array<[number | null | undefined, number | null | undefined, string | null]> = [
        [6, 0, '6 floors available'],
        [6, 2, '2 of 6 floors occupied'],
        [6, 6, 'Fully occupied across 6 floors'],
        [6, 9, 'Fully occupied across 6 floors'],
        [1, 0, null],
        [undefined, undefined, null],
    ];
    for (const [totalFloors, occupiedUnits, expected] of cases) {
        assert.equal(formatPropertyInventoryCaption(totalFloors, occupiedUnits), expected);
    }
});
