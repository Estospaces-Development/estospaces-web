import assert from 'node:assert/strict';
import { readFileSync } from 'node:fs';
import { resolve } from 'node:path';
import test from 'node:test';

const source = readFileSync(resolve(process.cwd(), 'src/components/dashboard/BrokerResponseWidget.tsx'), 'utf8');

test('matched client workspaces are searchable and bounded by pagination', () => {
    assert.match(source, /const MATCHED_WORKSPACE_PAGE_SIZE = 6/);
    assert.match(source, /aria-label="Search matched client workspaces"/);
    assert.match(source, /visibleMatchedRequests\.map/);
    assert.match(source, /aria-label="Matched client workspace pages"/);
    assert.match(source, /Page \{matchedWorkspacePage\} of \{matchedWorkspacePageCount\}/);
    assert.match(source, /setMatchedWorkspaceSearch\(''\)/);
    assert.match(source, /setMatchedWorkspacePage\(Math\.floor\(targetIndex \/ MATCHED_WORKSPACE_PAGE_SIZE\) \+ 1\)/);
    assert.doesNotMatch(source, /\{matchedRequests\.map/);
});
