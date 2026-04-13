import assert from 'node:assert/strict';
import test from 'node:test';

import {
    ApiRequestError,
    buildApiUrl,
    resolveManagerWorkflowErrorPresentation,
} from './apiUtils';

test('buildApiUrl keeps absolute service URLs intact', () => {
    const url = buildApiUrl('https://api.estospaces.dev', '/api/v1/leads/broker');

    assert.equal(url.toString(), 'https://api.estospaces.dev/api/v1/leads/broker');
});

test('buildApiUrl resolves local proxy paths against the current origin fallback', () => {
    const url = buildApiUrl('/__dev_proxy/core', '/api/v1/leads/broker');

    assert.equal(url.toString(), 'http://localhost/__dev_proxy/core/api/v1/leads/broker');
});

test('manager workflow errors classify purchase workflow outages from api errors', () => {
    const error = new ApiRequestError(
        'Live purchase workflow unavailable. Please retry the manager action.',
        'Temporary service issue',
        503,
    );

    assert.deepEqual(resolveManagerWorkflowErrorPresentation(error), {
        scope: 'purchase',
        title: 'Live purchase workflow unavailable',
        message: 'Live purchase workflow unavailable. Please retry the manager action.',
    });
});

test('manager workflow errors classify property readiness outages from plain messages', () => {
    assert.deepEqual(
        resolveManagerWorkflowErrorPresentation(
            'Property readiness temporarily unavailable. Please retry the manager action.',
        ),
        {
            scope: 'property_readiness',
            title: 'Property readiness temporarily unavailable',
            message: 'Property readiness temporarily unavailable. Please retry the manager action.',
        },
    );
});

test('manager workflow errors do not classify ordinary validation failures', () => {
    const error = new ApiRequestError(
        'Seller instruction record is required.',
        'Please review your input',
        400,
    );

    assert.equal(resolveManagerWorkflowErrorPresentation(error), null);
});
