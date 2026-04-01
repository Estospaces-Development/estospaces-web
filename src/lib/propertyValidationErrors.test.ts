import assert from 'node:assert/strict';
import test from 'node:test';

import { isValidUkPostcode, mapPropertyMutationFieldErrors } from '@/lib/propertyValidationErrors';

test('isValidUkPostcode accepts valid UK postcodes', () => {
    assert.equal(isValidUkPostcode('BT9 7GG'), true);
    assert.equal(isValidUkPostcode('SW1A 1AA'), true);
});

test('isValidUkPostcode rejects invalid UK postcodes', () => {
    assert.equal(isValidUkPostcode('INVALID'), false);
    assert.equal(isValidUkPostcode('12345'), false);
});

test('mapPropertyMutationFieldErrors translates api fields to form fields', () => {
    assert.deepEqual(
        mapPropertyMutationFieldErrors({
            price: 'Price must be greater than 0',
            address_line_1: 'Street address is required',
            property_size_sqft: 'Property area must be greater than 0',
            image_urls: 'At least one image is required',
            agent_name: 'Contact name is required',
            agent_email: 'Please enter a valid email address',
            agent_phone: 'Please enter a valid phone number',
            postcode: 'Please enter a valid UK postcode',
        }),
        {
            priceAmount: 'Price must be greater than 0',
            addressLine1: 'Street address is required',
            totalArea: 'Property area must be greater than 0',
            images: 'At least one image is required',
            contactName: 'Contact name is required',
            contactEmail: 'Please enter a valid email address',
            contactPhone: 'Please enter a valid phone number',
            postalCode: 'Please enter a valid UK postcode',
        },
    );
});
