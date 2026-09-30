import assert from 'node:assert/strict';
import test from 'node:test';

import {
    MANAGER_EMAIL_AMBIGUOUS,
    MANAGER_EMAIL_LOOKUP_FAILED,
    MANAGER_EMAIL_NOT_FOUND,
    MANAGER_EMAIL_NOT_MANAGER,
    MANAGER_EMAIL_SEARCH_MAX_PAGES,
    MANAGER_EMAIL_SEARCH_PAGE_SIZE,
    MANAGER_EMAIL_TOO_MANY,
    isManagerEmailInput,
    resolveManagerIdentifier,
    type ManagerEmailSearch,
    type ManagerEmailSearchUser,
    type ManagerIdentifierResult,
} from './adminPromotions';

const MANAGER_ID = '5f0c8a4e-2b1d-4c3e-9f6a-7b8c9d0e1f2a';

/** Fake core GET /api/v1/users: records every call and serves pages of users. */
function fakeUserSearch(pages: ManagerEmailSearchUser[][], total?: number, error: string | null = null) {
    const calls: Array<{ page: number; limit: number; search: string }> = [];
    const search: ManagerEmailSearch = async (page, limit, filters) => {
        calls.push({ page, limit, search: filters.search });
        return { data: pages[page - 1] ?? [], pagination: { total: total ?? pages.flat().length }, error };
    };
    return { search, calls };
}

const filler = (count: number, prefix: string): ManagerEmailSearchUser[] =>
    Array.from({ length: count }, (_, index) => ({ id: `${prefix}-${index}`, email: `${prefix}${index}.sam@example.com`, role: 'manager' }));

test('isManagerEmailInput treats anything with @ as an email', () => {
    assert.equal(isManagerEmailInput('sam@example.com'), true);
    assert.equal(isManagerEmailInput(MANAGER_ID), false);
    assert.equal(isManagerEmailInput(''), false);
});

const cases: Array<{
    name: string;
    input: string;
    pages: ManagerEmailSearchUser[][];
    total?: number;
    error?: string;
    expected: ManagerIdentifierResult;
    expectedCalls: number;
}> = [
    {
        name: 'a manager ID passes through normalised without a user search',
        input: `  ${MANAGER_ID.toUpperCase()} `,
        pages: [],
        expected: { ok: true, managerID: MANAGER_ID },
        expectedCalls: 0,
    },
    {
        name: 'an exact manager email resolves to that manager ID',
        input: 'sam@example.com',
        pages: [[{ id: MANAGER_ID, email: 'sam@example.com', role: 'manager' }]],
        expected: { ok: true, managerID: MANAGER_ID },
        expectedCalls: 1,
    },
    {
        name: 'the email match ignores case and surrounding spaces',
        input: '  Sam@Example.COM ',
        pages: [[{ id: MANAGER_ID.toUpperCase(), email: 'SAM@example.com', role: 'Manager' }]],
        expected: { ok: true, managerID: MANAGER_ID },
        expectedCalls: 1,
    },
    {
        name: 'substring matches from the core search are not accepted',
        input: 'sam@example.com',
        pages: [[
            { id: 'other-1', email: 'xsam@example.com', role: 'manager' },
            { id: 'other-2', email: 'sam@example.com.au', role: 'manager' },
        ]],
        expected: { ok: false, message: MANAGER_EMAIL_NOT_FOUND },
        expectedCalls: 1,
    },
    {
        name: 'no account at all',
        input: 'nobody@example.com',
        pages: [[]],
        expected: { ok: false, message: MANAGER_EMAIL_NOT_FOUND },
        expectedCalls: 1,
    },
    {
        name: 'an exact match that is a seeker is not a manager',
        input: 'sam@example.com',
        pages: [[{ id: MANAGER_ID, email: 'sam@example.com', role: 'user' }]],
        expected: { ok: false, message: MANAGER_EMAIL_NOT_MANAGER },
        expectedCalls: 1,
    },
    {
        name: 'an exact match that is an admin is not a manager',
        input: 'sam@example.com',
        pages: [[{ id: MANAGER_ID, email: 'sam@example.com', role: 'admin' }]],
        expected: { ok: false, message: MANAGER_EMAIL_NOT_MANAGER },
        expectedCalls: 1,
    },
    {
        name: 'two managers with the same email are refused',
        input: 'sam@example.com',
        pages: [[
            { id: MANAGER_ID, email: 'sam@example.com', role: 'manager' },
            { id: 'second', email: 'SAM@example.com', role: 'manager' },
        ]],
        expected: { ok: false, message: MANAGER_EMAIL_AMBIGUOUS },
        expectedCalls: 1,
    },
    {
        name: 'the exact match is found on a later page',
        input: 'sam@example.com',
        pages: [filler(MANAGER_EMAIL_SEARCH_PAGE_SIZE, 'a'), [{ id: MANAGER_ID, email: 'sam@example.com', role: 'manager' }]],
        expected: { ok: true, managerID: MANAGER_ID },
        expectedCalls: 2,
    },
    {
        name: 'the search stops once the reported total is reached',
        input: 'sam@example.com',
        pages: [filler(MANAGER_EMAIL_SEARCH_PAGE_SIZE, 'a'), filler(MANAGER_EMAIL_SEARCH_PAGE_SIZE, 'b')],
        total: MANAGER_EMAIL_SEARCH_PAGE_SIZE,
        expected: { ok: false, message: MANAGER_EMAIL_NOT_FOUND },
        expectedCalls: 1,
    },
    {
        name: 'the search gives up after the page cap without guessing',
        input: 'sam@example.com',
        pages: Array.from({ length: MANAGER_EMAIL_SEARCH_MAX_PAGES + 1 }, (_, page) => filler(MANAGER_EMAIL_SEARCH_PAGE_SIZE, `p${page}`)),
        total: MANAGER_EMAIL_SEARCH_PAGE_SIZE * (MANAGER_EMAIL_SEARCH_MAX_PAGES + 1),
        expected: { ok: false, message: MANAGER_EMAIL_TOO_MANY },
        expectedCalls: MANAGER_EMAIL_SEARCH_MAX_PAGES,
    },
    {
        name: 'a search error is reported, not treated as no match',
        input: 'sam@example.com',
        pages: [[]],
        error: 'Forbidden',
        expected: { ok: false, message: MANAGER_EMAIL_LOOKUP_FAILED },
        expectedCalls: 1,
    },
];

for (const testCase of cases) {
    test(`resolveManagerIdentifier: ${testCase.name}`, async () => {
        const { search, calls } = fakeUserSearch(testCase.pages, testCase.total, testCase.error ?? null);
        const result = await resolveManagerIdentifier(testCase.input, search);
        assert.deepEqual(result, testCase.expected);
        assert.equal(calls.length, testCase.expectedCalls);
        calls.forEach((call, index) => {
            assert.equal(call.page, index + 1);
            assert.equal(call.search, testCase.input.trim().toLowerCase());
            assert.equal(call.limit, MANAGER_EMAIL_SEARCH_PAGE_SIZE);
        });
        // The payment trial endpoints must only ever receive a user ID.
        if (result.ok) assert.equal(isManagerEmailInput(result.managerID), false);
    });
}

test('resolveManagerIdentifier stops on a short page when core sends no pagination', async () => {
    let calls = 0;
    const result = await resolveManagerIdentifier('sam@example.com', async () => {
        calls += 1;
        return { data: [{ id: MANAGER_ID, email: 'sam@example.com', role: 'user' }], pagination: null, error: null };
    });
    assert.deepEqual(result, { ok: false, message: MANAGER_EMAIL_NOT_MANAGER });
    assert.equal(calls, 1);
});

test('resolveManagerIdentifier reports a thrown search as a lookup failure', async () => {
    const result = await resolveManagerIdentifier('sam@example.com', async () => {
        throw new Error('network down');
    });
    assert.deepEqual(result, { ok: false, message: MANAGER_EMAIL_LOOKUP_FAILED });
});
