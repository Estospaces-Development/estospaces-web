import test from 'node:test';
import assert from 'node:assert/strict';

import { appendToastUnlessDuplicate } from './toastQueue';

test('identical toasts are shown once; different ones still stack (issue 457)', () => {
    const timeout = { id: '1', type: 'error', message: 'Request timed out' };
    let toasts = appendToastUnlessDuplicate([], timeout);
    toasts = appendToastUnlessDuplicate(toasts, { ...timeout, id: '2' });
    toasts = appendToastUnlessDuplicate(toasts, { ...timeout, id: '3' });
    assert.deepEqual(toasts.map((toast) => toast.id), ['1']);

    toasts = appendToastUnlessDuplicate(toasts, { id: '4', type: 'error', message: 'Failed to fetch' });
    toasts = appendToastUnlessDuplicate(toasts, { id: '5', type: 'success', message: 'Request timed out' });
    assert.deepEqual(toasts.map((toast) => toast.id), ['1', '4', '5']);
});
