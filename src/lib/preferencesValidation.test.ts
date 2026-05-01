import assert from 'node:assert/strict';
import test from 'node:test';

import { validateUserPreferences } from './preferencesValidation';

test('validateUserPreferences rejects invalid listing type and negative numbers', () => {
    assert.deepEqual(validateUserPreferences({
        preferred_type: 'auction',
        min_budget: -1,
        max_budget: null,
        min_bedrooms: null,
        max_bedrooms: null,
        search_radius_km: null,
    }), {
        preferred_type: 'Preferred listing type must be rent, sale, or no default',
        min_budget: 'Minimum budget must be zero or greater',
    });
});

test('validateUserPreferences rejects inconsistent minimum and maximum values', () => {
    assert.deepEqual(validateUserPreferences({
        preferred_type: 'rent',
        min_budget: 2000,
        max_budget: 1000,
        min_bedrooms: 4,
        max_bedrooms: 2,
        search_radius_km: null,
    }), {
        max_budget: 'Maximum budget must be greater than or equal to minimum budget',
        max_bedrooms: 'Maximum bedrooms must be greater than or equal to minimum bedrooms',
    });
});
