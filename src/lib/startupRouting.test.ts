import test from 'node:test';
import assert from 'node:assert/strict';
import { resolveStartupPath } from '@/lib/startupRouting';

test('startup route keeps logged-out users on the public homepage', () => {
    assert.equal(resolveStartupPath(false), '/');
});

test('startup route sends authenticated users to their role dashboard', () => {
    assert.equal(resolveStartupPath(true, 'user'), '/user/dashboard');
    assert.equal(resolveStartupPath(true, 'manager'), '/manager/dashboard');
    assert.equal(resolveStartupPath(true, 'broker'), '/manager/dashboard');
    assert.equal(resolveStartupPath(true, 'admin'), '/admin/dashboard');
});

test('startup route defaults authenticated users to the user dashboard when role is missing', () => {
    assert.equal(resolveStartupPath(true), '/user/dashboard');
});
