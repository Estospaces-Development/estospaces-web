import assert from 'node:assert/strict';
import { readFileSync } from 'node:fs';
import { resolve } from 'node:path';
import test from 'node:test';

const source = readFileSync(resolve(process.cwd(), 'src/components/dashboard/StatCard.tsx'), 'utf8');

test('negative dashboard trends use a downward icon and loss color', () => {
    assert.match(source, /change\.trim\(\)\.startsWith\('-'\)/);
    assert.match(source, /isNegativeChange \? TrendingDown : TrendingUp/);
    assert.match(source, /isNegativeChange \? 'text-red-600 dark:text-red-400' : trendColor/);
});
