import assert from 'node:assert/strict';
import test from 'node:test';

import { validateUserPreferences, validateCityInput, hasNoSearchPreferences } from './preferencesValidation';

test('validateUserPreferences rejects invalid listing type and negative numbers', () => {
    assert.deepEqual(validateUserPreferences({
        preferred_city: '',
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
        preferred_city: '',
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

test('validateCityInput allows valid city names and rejects symbols and long input', () => {
    assert.equal(validateCityInput(''), undefined);
    assert.equal(validateCityInput('London'), undefined);
    assert.equal(validateCityInput('St Albans'), undefined);
    assert.equal(validateCityInput("O'Connor"), undefined);
    assert.equal(validateCityInput('New-York'), undefined);
    // 13 chars exceeds MAX_CITY_LENGTH (12)
    const lengthError = validateCityInput('AB12345678901');
    assert.ok(lengthError, 'expects error for too-long city');
    assert.ok((lengthError as string).startsWith('City name must be'));
    // Symbols and digits within length limit
    const charsError = validateCityInput('L0nd0n!');
    assert.ok(charsError, 'expects error for invalid characters');
    assert.ok((charsError as string).startsWith('City name can only contain'));
    assert.ok((validateCityInput('$$$$') as string).startsWith('City name can only contain'));
});

test('hasNoSearchPreferences returns true only when every filter is empty', () => {
    assert.equal(hasNoSearchPreferences({
        preferred_city: '',
        preferred_type: '',
        min_budget: null,
        max_budget: null,
        min_bedrooms: null,
        max_bedrooms: null,
        search_radius_km: null,
    }), true);
    assert.equal(hasNoSearchPreferences({
        preferred_city: 'London',
        preferred_type: '',
        min_budget: null,
        max_budget: null,
        min_bedrooms: null,
        max_bedrooms: null,
        search_radius_km: null,
    }), false);
    assert.equal(hasNoSearchPreferences({
        preferred_city: '',
        preferred_type: '',
        min_budget: 1000,
        max_budget: null,
        min_bedrooms: null,
        max_bedrooms: null,
        search_radius_km: null,
    }), false);
});
