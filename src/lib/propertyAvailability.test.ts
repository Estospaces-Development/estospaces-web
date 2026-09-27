import assert from 'node:assert/strict';
import { readFileSync } from 'node:fs';
import test from 'node:test';

import { getListingJourneyAvailability, isListingClosedForNewJourneys } from '@/lib/propertyAvailability';
import { requestDirectPropertyFastTrack } from '@/lib/propertyFastTrackRequest';

test('sold, let and unavailable listings are closed for new journeys', () => {
    assert.equal(getListingJourneyAvailability('sold').reason, 'sold');
    assert.equal(getListingJourneyAvailability(' SOLD ').isClosed, true);
    assert.equal(getListingJourneyAvailability('let').reason, 'let');
    assert.equal(getListingJourneyAvailability('rented').reason, 'let');
    assert.equal(getListingJourneyAvailability('off_market').reason, 'unavailable');
    assert.equal(getListingJourneyAvailability('sale_closing').reason, 'unavailable');
    assert.match(getListingJourneyAvailability('sold').message, /sold/i);
});

test('live listings stay open for new journeys', () => {
    for (const status of ['published', 'available', 'active', 'online', 'under_offer', '', undefined, null]) {
        assert.equal(isListingClosedForNewJourneys(status), false, `status ${String(status)} should be open`);
    }
});

test('direct Fast Track request refuses a sold listing before creating a lead', async () => {
    const calls: string[] = [];
    await assert.rejects(
        requestDirectPropertyFastTrack({
            property: { id: 'property-sold', title: 'Sold Home', listing_type: 'sale', status: 'sold' },
            clientId: 'user-1',
            clientName: 'Buyer',
            dependencies: {
                createLead: async () => {
                    calls.push('createLead');
                    return { data: null, error: 'should not be called' };
                },
                requestFastTrack: async () => {
                    calls.push('requestFastTrack');
                    return { requested: false, requestedAt: null, error: 'should not be called' };
                },
            },
        }),
        /sold/i,
    );
    assert.deepEqual(calls, []);
});

test('user property surfaces gate new-journey CTAs on listing status', () => {
    const detail = readFileSync('src/pages/user/properties/[id]/page.tsx', 'utf8');
    assert.match(detail, /const listingAvailability = getListingJourneyAvailability\(property\?\.status\)/);
    assert.match(detail, /const isNewJourneyBlocked = listingAvailability\.isClosed && !hasActiveFastTrackJourney/);
    assert.match(detail, /const isFastTrackCtaDisabled = isFastTrackRequestControlDisabled \|\| isNewJourneyBlocked;/);
    assert.equal((detail.match(/disabled=\{isFastTrackCtaDisabled\}/g) || []).length, 3);
    assert.match(detail, /property\.listing_type === 'rent' && !listingAvailability\.isClosed/);
    assert.match(detail, /\{!listingAvailability\.isClosed && \(\s*<form ref=\{viewingFormRef\}/);
    assert.match(detail, /const handleScheduleViewing = async[\s\S]{0,120}if \(listingAvailability\.isClosed\)/);
    assert.match(detail, /const handleSubmitRentalApplication = async[\s\S]{0,120}if \(listingAvailability\.isClosed\)/);

    const card = readFileSync('src/components/dashboard/PropertyCard.tsx', 'utf8');
    assert.match(card, /onStartFastTrack && !isListingClosedForNewJourneys\(property\?\.status\)/);

    const mapView = readFileSync('src/components/dashboard/MapView.tsx', 'utf8');
    assert.match(mapView, /!isListingClosedForNewJourneys\(house\.status\)/);

    const nearby = readFileSync('src/components/dashboard/NearbyPropertiesMap.tsx', 'utf8');
    assert.match(nearby, /!isListingClosedForNewJourneys\(property\.status\)/);
    assert.match(nearby, /isListingClosedForNewJourneys\(selectedProperty\.status\)/);
});
