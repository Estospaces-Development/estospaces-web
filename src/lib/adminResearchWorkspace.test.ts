import assert from 'node:assert/strict';
import { readFileSync } from 'node:fs';
import { resolve } from 'node:path';
import { test } from 'node:test';

const source = (path: string) => readFileSync(resolve(process.cwd(), path), 'utf8');

test('admin research is reachable from the route, sidebar, command search and dashboard without a flag', () => {
    const app = source('src/App.tsx');
    assert.match(app, /<Route path="research" element=\{<AdminResearch \/>\} \/>/);
    assert.match(app, /const AdminResearch = lazyPage\(\(\) => import\('\.\/pages\/admin\/research\/page'\)\);/);
    assert.doesNotMatch(app, /AdminResearchUnavailable/);

    assert.match(source('src/components/layout/AdminSidebar.tsx'), /label: 'Observational Research', path: '\/admin\/research'/);
    assert.match(source('src/components/layout/AdminHeader.tsx'), /label: 'Observational Research', path: '\/admin\/research'/);
    assert.match(source('src/pages/admin/dashboard/page.tsx'), /onClick=\{\(\) => navigate\('\/admin\/research'\)\}/);

    for (const file of ['src/lib/launchFlags.ts', 'src/App.tsx', 'src/pages/admin/dashboard/page.tsx']) {
        assert.doesNotMatch(source(file), /ADMIN_RESEARCH_ENABLED/, file);
    }
});

test('research service calls exactly the routes core registers for /api/v1/admin/research', () => {
    const service = source('src/services/adminResearchService.ts');
    // The list URL appends an optional query string, so drop that template tail.
    const calls = [...service.matchAll(/`\$\{CORE_URL\(\)\}(\/api\/v1\/admin\/research[^`]*)`/g)]
        .map((match) => match[1].replace(/\$\{query \? $/, ''));
    assert.deepEqual([...calls].sort(), [
        '/api/v1/admin/research/evidence/${evidenceId}',
        '/api/v1/admin/research/observations/${observationId}',
        '/api/v1/admin/research/sessions',
        '/api/v1/admin/research/sessions',
        '/api/v1/admin/research/sessions/${sessionId}',
        '/api/v1/admin/research/sessions/${sessionId}/evidence',
        '/api/v1/admin/research/sessions/${sessionId}/observations',
        '/api/v1/admin/research/summary',
    ]);
});

test('proof scripts run against the real backend instead of skipping', () => {
    for (const script of ['scripts/admin-research-proof.cjs', 'scripts/admin-research-disposable-proof.cjs']) {
        assert.doesNotMatch(source(script), /skipUnlessAdminResearchEnabled|admin-research-availability/, script);
    }
    assert.doesNotMatch(source('scripts/mobile-responsive-audit.cjs'), /optionalCompatibilityPaths/);
});
