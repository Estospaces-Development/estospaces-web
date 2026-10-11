import assert from 'node:assert/strict';
import { readFileSync } from 'node:fs';
import test from 'node:test';

const source = readFileSync(new URL('./AdminPromotionsSection.tsx', import.meta.url), 'utf8');

test('the promotions table shows an Ended badge and no Pause action for an expired promotion (MB-0750)', () => {
    assert.match(source, /getPromotionDisplayStatus\(promotion, now\)/);
    assert.match(source, /ended: '[^']+'/);
    assert.match(source, /\{displayStatus\}<\/span>/);
    assert.match(source, /displayStatus === 'ended' && action === 'pause'/);
});
