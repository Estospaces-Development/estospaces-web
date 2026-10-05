import assert from 'node:assert/strict';
import { readFileSync } from 'node:fs';
import test from 'node:test';

const source = readFileSync(new URL('../contexts/ManagerVerificationContext.tsx', import.meta.url), 'utf8');

test('verification refetches keep the current view instead of showing the loading screen (web-app#379)', () => {
    const fetchData = source.match(/const fetchData = useCallback\(async \(\) => \{([\s\S]*?)\n {4}\}, \[/)?.[1] ?? '';
    assert.ok(fetchData, 'fetchData not found');
    assert.match(fetchData, /if \(loadedUserIdRef\.current !== user\.id\) \{\s*setIsLoading\(true\);\s*\}/);
    assert.doesNotMatch(fetchData.replace(/if \(loadedUserIdRef\.current !== user\.id\) \{\s*setIsLoading\(true\);\s*\}/, ''), /setIsLoading\(true\)/);
    assert.match(fetchData, /setDocuments\(result\.data\.documents\);\s*loadedUserIdRef\.current = user\.id;/);
});
