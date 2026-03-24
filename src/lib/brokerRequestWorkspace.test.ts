import assert from 'node:assert/strict';
import test from 'node:test';
import { buildBrokerRequestWorkspacePath } from './brokerRequestWorkspace';

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
