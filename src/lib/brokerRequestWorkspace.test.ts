import assert from 'node:assert/strict';
import test from 'node:test';
import {
    BROKER_REQUEST_WORKSPACE_EVENT,
    buildBrokerRequestWorkspacePath,
    publishBrokerRequestWorkspaceSelection,
    readBrokerRequestWorkspaceSelection,
} from './brokerRequestWorkspace';

test('broker request workspace path keeps users in the dashboard workspace', () => {
    assert.equal(
        buildBrokerRequestWorkspacePath('request-123'),
        '/user/dashboard?workspace=broker-request&request=request-123#broker-request-workspace',
    );
});

test('broker request workspace path still points to the shared dashboard workspace without a request id', () => {
    assert.equal(
        buildBrokerRequestWorkspacePath(),
        '/user/dashboard?workspace=broker-request#broker-request-workspace',
    );
});

test('broker request workspace helpers persist and broadcast the selected request id', () => {
    const storage = new Map<string, string>();
    const events: string[] = [];
    const originalWindow = (globalThis as any).window;
    const originalCustomEvent = (globalThis as any).CustomEvent;

    class TestCustomEvent {
        type: string;
        detail: any;

        constructor(type: string, init?: { detail?: any }) {
            this.type = type;
            this.detail = init?.detail;
        }
    }

    (globalThis as any).CustomEvent = TestCustomEvent;
    (globalThis as any).window = {
        sessionStorage: {
            getItem: (key: string) => storage.get(key) ?? null,
            setItem: (key: string, value: string) => storage.set(key, value),
            removeItem: (key: string) => storage.delete(key),
        },
        dispatchEvent: (event: TestCustomEvent) => {
            events.push(`${event.type}:${event.detail?.requestId ?? 'none'}`);
            return true;
        },
    };

    publishBrokerRequestWorkspaceSelection('request-123');
    assert.equal(readBrokerRequestWorkspaceSelection(), 'request-123');
    assert.deepEqual(events, [`${BROKER_REQUEST_WORKSPACE_EVENT}:request-123`]);

    publishBrokerRequestWorkspaceSelection(null);
    assert.equal(readBrokerRequestWorkspaceSelection(), null);
    assert.deepEqual(events, [
        `${BROKER_REQUEST_WORKSPACE_EVENT}:request-123`,
        `${BROKER_REQUEST_WORKSPACE_EVENT}:none`,
    ]);

    (globalThis as any).window = originalWindow;
    (globalThis as any).CustomEvent = originalCustomEvent;
});
