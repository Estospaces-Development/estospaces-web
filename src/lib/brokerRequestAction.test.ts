import assert from 'node:assert/strict';
import test from 'node:test';

import {
    beginBrokerRequestAction,
    createBrokerRequestActionState,
    finishBrokerRequestAction,
    hasActiveBrokerRequestAction,
    isBrokerRequestActionCurrent,
} from './brokerRequestAction';

test('background refreshes do not invalidate an in-flight broker request mutation', async () => {
    const state = createBrokerRequestActionState();
    const generation = beginBrokerRequestAction(state);
    assert.ok(generation);

    let resolveMutation!: () => void;
    const mutation = new Promise<void>((resolve) => {
        resolveMutation = resolve;
    });
    const completion = mutation.then(() => isBrokerRequestActionCurrent(state, generation));

    const unrelatedLoadGeneration = 42;
    assert.equal(unrelatedLoadGeneration, 42);
    assert.equal(isBrokerRequestActionCurrent(state, generation), true);
    assert.equal(beginBrokerRequestAction(state), null);

    resolveMutation();
    assert.equal(await completion, true);
    assert.equal(finishBrokerRequestAction(state, generation), true);
    assert.equal(hasActiveBrokerRequestAction(state), false);
});
