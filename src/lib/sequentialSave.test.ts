import test from 'node:test';
import assert from 'node:assert/strict';

import { createSequentialSaver } from './sequentialSave';

const deferred = <T,>() => {
    let resolve!: (value: T) => void;
    const promise = new Promise<T>((r) => { resolve = r; });
    return { promise, resolve };
};

test('saves run one at a time in call order', async () => {
    const started: string[] = [];
    const gates = new Map<string, ReturnType<typeof deferred<string>>>();
    const save = createSequentialSaver((value: string) => {
        started.push(value);
        const gate = deferred<string>();
        gates.set(value, gate);
        return gate.promise;
    });

    const first = save('collapsed');
    const second = save('expanded');
    await Promise.resolve();
    assert.deepEqual(started, ['collapsed'], 'second save must wait for the first');

    gates.get('collapsed')!.resolve('collapsed');
    await first;
    await new Promise((r) => setTimeout(r, 0));
    assert.deepEqual(started, ['collapsed', 'expanded']);
    gates.get('expanded')!.resolve('expanded');
    await second;
});

test('only the most recent call is reported as latest', async () => {
    const save = createSequentialSaver(async (value: number) => value);
    const older = save(1);
    const newer = save(2);
    assert.deepEqual(await older, { result: 1, isLatest: false });
    assert.deepEqual(await newer, { result: 2, isLatest: true });
});

test('a failed save does not block later saves', async () => {
    const save = createSequentialSaver(async (value: number) => {
        if (value === 1) throw new Error('network');
        return value;
    });
    await assert.rejects(save(1), /network/);
    assert.deepEqual(await save(2), { result: 2, isLatest: true });
});
