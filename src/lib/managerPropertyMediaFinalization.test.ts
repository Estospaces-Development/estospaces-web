import test from 'node:test';
import assert from 'node:assert/strict';

import { shouldReassignDraftPropertyMedia } from '@/lib/managerPropertyMediaFinalization';

const stagedMediaFile = {
    entity_type: 'property',
    entity_id: 'draft-property-media',
};

test('skips draft media reassignment for a new property with no staged uploads', () => {
    assert.equal(
        shouldReassignDraftPropertyMedia({
            existingPropertyId: null,
            draftEntityId: 'draft-property-media',
            createdPropertyId: 'created-property',
            imageEntries: [],
            videoEntries: [],
            mediaFiles: [],
        }),
        false,
    );
});

test('reassigns draft media when selected files were uploaded during new property save', () => {
    assert.equal(
        shouldReassignDraftPropertyMedia({
            existingPropertyId: null,
            draftEntityId: 'draft-property-media',
            createdPropertyId: 'created-property',
            imageEntries: [{ name: 'kitchen.webp' }],
            videoEntries: [],
            mediaFiles: [],
        }),
        true,
    );
});

test('reassigns draft media when the media list already contains draft property files', () => {
    assert.equal(
        shouldReassignDraftPropertyMedia({
            existingPropertyId: null,
            draftEntityId: 'draft-property-media',
            createdPropertyId: 'created-property',
            imageEntries: [],
            videoEntries: [],
            mediaFiles: [stagedMediaFile],
        }),
        true,
    );
});

test('skips draft media reassignment while editing an existing property', () => {
    assert.equal(
        shouldReassignDraftPropertyMedia({
            existingPropertyId: 'existing-property',
            draftEntityId: 'draft-property-media',
            createdPropertyId: 'existing-property',
            imageEntries: [{ name: 'replacement.webp' }],
            videoEntries: [],
            mediaFiles: [stagedMediaFile],
        }),
        false,
    );
});

