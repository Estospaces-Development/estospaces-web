import assert from 'node:assert/strict';
import { readFileSync } from 'node:fs';
import { resolve } from 'node:path';
import test from 'node:test';

for (const file of ['src/pages/user/properties/[id]/page.tsx', 'src/pages/manager/dashboard/properties/[id]/page.tsx']) {
    test(`listing detail title is clamped to two lines on mobile and keeps the full name on hover (#731): ${file}`, () => {
        const source = readFileSync(resolve(process.cwd(), file), 'utf8');
        const h1 = source.match(/<h1 title=\{property\.title\} className="([^"]+)"/);
        assert.ok(h1, 'h1 exposes the full title via title attribute');
        assert.match(h1[1], /\bline-clamp-2\b/);
        assert.match(h1[1], /\btext-balance\b/);
        assert.match(h1[1], /\b(sm|md):line-clamp-none\b/);
    });
}
