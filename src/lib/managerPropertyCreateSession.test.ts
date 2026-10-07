import assert from 'node:assert/strict';
import test from 'node:test';

import { ApiRequestError } from '@/lib/apiUtils';

import { createManagerPropertyCreateSession } from './managerPropertyCreateSession';

type Saved = { id: string; title: string; status: string };

// Stands in for core: a create with a known key returns the existing record.
const fakeCore = () => {
    const byKey = new Map<string, Saved>();
    const calls: string[] = [];
    let loseNextResponse = false;
    let lostStatus: number | undefined;
    let failNextUpdate = false;
    return {
        byKey,
        calls,
        // No status: the response never arrived. A status: core committed, then failed (e.g. 503).
        loseNextResponse: (status?: number) => { loseNextResponse = true; lostStatus = status; },
        failNextUpdate: () => { failNextUpdate = true; },
        create: (payload: Omit<Saved, 'id'>) => async (key: string) => {
            calls.push(`create:${key}`);
            const record = byKey.get(key) ?? { id: `property-${byKey.size + 1}`, ...payload };
            byKey.set(key, record);
            if (loseNextResponse) {
                loseNextResponse = false;
                throw new ApiRequestError('Failed to fetch', 'Network error', lostStatus);
            }
            return record;
        },
        update: (payload: Omit<Saved, 'id'>) => async (id: string) => {
            calls.push(`update:${id}`);
            if (failNextUpdate) {
                failNextUpdate = false;
                throw new ApiRequestError('Failed to fetch', 'Network error');
            }
            const entry = [...byKey.entries()].find(([, record]) => record.id === id);
            assert.ok(entry, `update of unknown property ${id}`);
            entry[1] = { id, ...payload };
            byKey.set(entry[0], entry[1]);
            return entry[1];
        },
    };
};

test('a save retried after a lost create response updates the one property core made (MB-0176)', async () => {
    const core = fakeCore();
    const session = createManagerPropertyCreateSession('form-key');
    const draft = { title: 'Lost draft', status: 'draft' };

    core.loseNextResponse();
    await assert.rejects(session.save(core.create(draft), core.update(draft)), /Failed to fetch/);
    assert.equal(core.byKey.size, 1);

    // The manager edits the form and submits instead of retrying the draft.
    const submission = { title: 'Lost draft, renamed', status: 'pending_approval' };
    const saved = await session.save(core.create(submission), core.update(submission));

    assert.equal(core.byKey.size, 1);
    assert.deepEqual(saved, { id: 'property-1', ...submission });
    assert.deepEqual(core.calls, ['create:form-key', 'create:form-key', 'update:property-1']);

    // From now on the form is in edit mode for that property.
    await session.save(core.create(submission), core.update(submission));
    assert.deepEqual(core.calls.slice(3), ['update:property-1']);
});

test('a create rejected by validation is retried as a plain create', async () => {
    const core = fakeCore();
    const session = createManagerPropertyCreateSession('form-key');
    const draft = { title: 'Draft', status: 'draft' };
    const rejected = async () => {
        throw new ApiRequestError('Please review the highlighted fields.', 'Invalid', 400);
    };

    await assert.rejects(session.save(rejected, core.update(draft)));
    const saved = await session.save(core.create(draft), core.update(draft));

    assert.equal(saved?.id, 'property-1');
    assert.deepEqual(core.calls, ['create:form-key']);
});

test('a 5xx create is recovered like a lost response, and a failed recovery update keeps the id', async () => {
    const core = fakeCore();
    const session = createManagerPropertyCreateSession('form-key');
    const draft = { title: 'Draft', status: 'draft' };

    core.loseNextResponse(503);
    await assert.rejects(session.save(core.create(draft), core.update(draft)));
    core.failNextUpdate();
    await assert.rejects(session.save(core.create(draft), core.update(draft)));
    await session.save(core.create(draft), core.update(draft));

    assert.equal(core.byKey.size, 1);
    assert.deepEqual(core.calls, ['create:form-key', 'create:form-key', 'update:property-1', 'update:property-1']);
});

test('a 409 for a deleted property key is surfaced without saving onto anything', async () => {
    const core = fakeCore();
    const session = createManagerPropertyCreateSession('form-key');
    const draft = { title: 'Draft', status: 'draft' };
    const deletedKey = async () => {
        throw new ApiRequestError('this property was deleted; reload the page to create a new one', 'Conflict', 409);
    };

    core.loseNextResponse();
    await assert.rejects(session.save(core.create(draft), core.update(draft)));
    await assert.rejects(session.save(deletedKey, core.update(draft)), /deleted/);

    assert.deepEqual(core.calls, ['create:form-key']);
});
