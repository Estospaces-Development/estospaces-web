import assert from 'node:assert/strict';
import test from 'node:test';

import {
    describeManagerListingAction,
    getManagerListingActionLabel,
    getManagerListingActions,
    presentManagerListingActionError,
    summarizeActiveWork,
} from './managerListingActions';

const APPROVED = '2026-03-01T12:00:00Z';

test('only the actions core would accept are offered for each status', () => {
    const cases: Array<[string, { status?: string; publishedAt?: string }, string[]]> = [
        ['a live listing', { status: 'published', publishedAt: APPROVED }, ['unpublish', 'mark_sold']],
        ['an available listing', { status: 'available' }, ['unpublish', 'mark_sold']],
        ['an online alias', { status: 'online' }, ['unpublish', 'mark_sold']],
        ['an active alias', { status: ' ACTIVE ' }, ['unpublish', 'mark_sold']],
        ['an owner-unpublished draft', { status: 'draft', publishedAt: APPROVED }, ['republish']],
        ['a never-approved draft', { status: 'draft' }, []],
        ['a pending listing', { status: 'pending_approval' }, []],
        ['a rejected listing', { status: 'rejected', publishedAt: APPROVED }, []],
        ['a suspended listing', { status: 'suspended', publishedAt: APPROVED }, []],
        ['a sold listing', { status: 'sold', publishedAt: APPROVED }, []],
        ['a rented listing', { status: 'rented' }, []],
        ['a sale in closing', { status: 'sale_closing' }, []],
        ['no status', {}, []],
    ];
    for (const [name, subject, expected] of cases) {
        assert.deepEqual(getManagerListingActions(subject), expected, name);
    }
});

test('sale and buy listings are marked sold, every other kind is marked let', () => {
    for (const listingType of ['sale', 'buy', ' Sale ']) {
        assert.equal(getManagerListingActionLabel('mark_sold', listingType), 'Mark sold', listingType);
    }
    for (const listingType of ['rent', 'lease', 'short_term', undefined, null]) {
        assert.equal(getManagerListingActionLabel('mark_sold', listingType), 'Mark let', String(listingType));
    }
    assert.equal(getManagerListingActionLabel('unpublish'), 'Unpublish');
    assert.equal(getManagerListingActionLabel('republish'), 'Republish');
});

test('each confirmation says what happens and that open bookings block it', () => {
    const unpublish = describeManagerListingAction('unpublish', { title: 'Flat 4' });
    assert.equal(unpublish.confirmLabel, 'Unpublish');
    assert.match(unpublish.summary, /Flat 4 leaves search and public pages straight away/);
    assert.match(unpublish.effects.join(' '), /stays in your inventory as a draft/);
    assert.match(unpublish.effects.join(' '), /Fast Track case, viewing, application or contract is still open/);

    const republish = describeManagerListingAction('republish', { title: 'Flat 4' });
    assert.equal(republish.confirmLabel, 'Republish');
    assert.match(republish.effects.join(' '), /published-listing limit/);

    const sold = describeManagerListingAction('mark_sold', { title: 'Villa', listingType: 'sale' });
    assert.equal(sold.title, 'Mark this listing as sold?');
    assert.equal(sold.confirmLabel, 'Mark as sold');
    assert.match(sold.effects.join(' '), /Buyers can no longer start/);
    assert.match(sold.effects.join(' '), /can't reopen it from your dashboard/);

    const letListing = describeManagerListingAction('mark_sold', { title: 'Flat 4', listingType: 'rent' });
    assert.equal(letListing.title, 'Mark this listing as let?');
    assert.match(letListing.summary, /marked as let and fully occupied/);
    assert.match(letListing.effects.join(' '), /Renters can no longer start/);
    assert.match(letListing.successMessage, /marked as let/);

    assert.match(describeManagerListingAction('unpublish', {}).summary, /^This listing leaves search/);
});

test('active work is listed one kind per line with singular and plural wording', () => {
    assert.deepEqual(
        summarizeActiveWork({ fast_track_cases: 1, upcoming_viewings: 2, open_applications: 0, open_contracts: 1, open_reservations: 3 }),
        ['1 active Fast Track case', '2 upcoming viewings', '1 open contract', '3 upcoming reservations'],
    );
    assert.deepEqual(summarizeActiveWork({ open_applications: 2 }), ['2 open applications']);
    assert.deepEqual(summarizeActiveWork({}), []);
    assert.deepEqual(summarizeActiveWork(undefined), []);
});

test('a 409 for open bookings lists what is still open and what to do', () => {
    const failure = presentManagerListingActionError('unpublish', {
        error: 'This property cannot be unpublished while it has active bookings (2 upcoming viewings, 1 open contract). Finish or cancel them first.',
        status: 409,
        code: 'property_has_active_booking_work',
        activeWork: { upcoming_viewings: 2, open_contracts: 1 },
    });
    assert.equal(failure.title, "You can't unpublish while bookings are open");
    assert.deepEqual(failure.items, ['2 upcoming viewings', '1 open contract']);
    assert.match(failure.message, /Finish or cancel these first/);
    assert.match(failure.message, /Withdraw any unsigned contract; a signed contract blocks this until its end date/);

    const sold = presentManagerListingActionError('mark_sold', { error: 'x', status: 409, code: 'property_has_active_booking_work', activeWork: { fast_track_cases: 1 } }, { listingType: 'sale' });
    assert.equal(sold.title, "You can't mark this listing as sold while bookings are open");
    assert.doesNotMatch(sold.message, /Withdraw/);

    // A core that sent no counts still gets its own sentence shown.
    const noCounts = presentManagerListingActionError('republish', { error: 'This property cannot be republished while it has active bookings (1 open application).', status: 409, code: 'property_has_active_booking_work' });
    assert.deepEqual(noCounts.items, []);
    assert.match(noCounts.message, /1 open application/);
});

test('a 503 because Booking could not answer says nothing was changed and to retry', () => {
    const failure = presentManagerListingActionError('mark_sold', {
        error: 'We could not confirm this property has no active Fast Track cases.',
        status: 503,
        code: 'booking_activity_unavailable',
    });
    assert.equal(failure.title, "We couldn't check this listing's bookings");
    assert.match(failure.message, /Nothing was changed/);
    assert.match(failure.message, /try again/);

    // Payment being down on a republish is also a 503, but never shows the raw "entitlement unavailable".
    const payment = presentManagerListingActionError('republish', { error: 'entitlement unavailable', status: 503 });
    assert.match(payment.message, /Nothing was changed/);
    assert.doesNotMatch(payment.message, /entitlement/);
});

test('a lost answer does not claim that nothing was changed', () => {
    const failure = presentManagerListingActionError('unpublish', { error: 'Network request failed' });
    assert.equal(failure.title, "We didn't get an answer");
    assert.match(failure.message, /Refresh the page to see whether the change was made/);
    assert.doesNotMatch(failure.message, /Nothing was changed/);
});

test('a gateway error does not claim that nothing was changed either', () => {
    for (const status of [502, 504]) {
        const failure = presentManagerListingActionError('mark_sold', { error: 'Bad Gateway', status });
        assert.equal(failure.title, "We didn't get an answer", String(status));
        assert.doesNotMatch(failure.message, /Nothing was changed/, String(status));
    }
});

test('the unpublish dialog says an edit sends the listing back to admin review', () => {
    const copy = describeManagerListingAction('unpublish', { title: 'Powai Flat' });
    const effects = copy.effects.join(' ');
    assert.match(effects, /republish it as it is without waiting for admin approval/);
    assert.match(effects, /If you edit it first, it goes back to admin review/);
});

test('state conflicts, the plan limit, ownership and readiness each get their own wording', () => {
    const conflict = presentManagerListingActionError('republish', {
        error: 'Only a listing you unpublished can be republished. A listing that was never approved, or that was rejected or suspended, needs admin approval.',
        status: 409,
        code: 'property_status_conflict',
    });
    assert.equal(conflict.title, "This listing can't be changed that way");
    assert.match(conflict.message, /needs admin approval/);

    const limit = presentManagerListingActionError('republish', { error: 'published property limit reached', status: 409 });
    assert.equal(limit.title, 'Plan limit reached');
    assert.match(limit.message, /plan's limit of published properties/);
    assert.deepEqual(limit.upgrade, { label: 'Upgrade your plan', href: '/manager/subscription' });

    const notOwner = presentManagerListingActionError('unpublish', { error: 'forbidden: not property owner', status: 403 });
    assert.equal(notOwner.message, 'You can only change listings you own.');

    const notReady = presentManagerListingActionError('republish', { error: 'your manager verification must be approved before you can submit a property for admin approval', status: 403 });
    assert.match(notReady.message, /manager verification must be approved/);

    assert.match(presentManagerListingActionError('unpublish', { error: 'property not found', status: 404 }).message, /no longer exists/);
    // A web that is deployed before core has the route gets core's router 404, which is not a missing listing.
    const skew = presentManagerListingActionError('unpublish', { error: 'Cannot PUT /api/v1/properties/property-1/manager-status', status: 404 });
    assert.equal(skew.title, 'Not available yet');
    assert.doesNotMatch(skew.message, /no longer exists/);
    assert.match(presentManagerListingActionError('unpublish', { error: 'Internal server error', status: 500 }).message, /Something went wrong on our side/);
    assert.equal(presentManagerListingActionError('unpublish', { error: 'action must be one of unpublish, republish or mark_sold', status: 400 }).message, 'action must be one of unpublish, republish or mark_sold');
});
