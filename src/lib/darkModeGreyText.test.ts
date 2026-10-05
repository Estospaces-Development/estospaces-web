import assert from 'node:assert/strict';
import { readFileSync } from 'node:fs';
import test from 'node:test';

const read = (path: string) => readFileSync(new URL(`../${path}`, import.meta.url), 'utf8');

// globals.css darkens plain text-gray-400/500 in every theme so surfaces that stay white in dark
// mode (ManagerReviewModal) remain readable; labels on dark surfaces need their own dark: colour.
test('secondary labels on dark-capable surfaces have a dark-mode colour (web-app#565)', () => {
    const labels: Array<[string, string]> = [
        ['components/dashboard/BrokerResponseWidget.tsx', 'Live dispatch'],
        ['pages/manager/dashboard/page.tsx', 'Active cases'],
        ['pages/manager/dashboard/page.tsx', 'Closing soon'],
        ['pages/manager/dashboard/page.tsx', 'Completed'],
        ['pages/user/properties/[id]/page.tsx', 'Location & maps'],
        ['pages/user/properties/[id]/page.tsx', 'Viewing concierge'],
    ];
    for (const [file, label] of labels) {
        assert.match(read(file), new RegExp(`text-gray-400 dark:text-gray-400">${label}</p>`), `${file}: ${label}`);
    }
    assert.match(read('globals.css'), /^\s*\.text-gray-400 \{\s*color: #4b5563;/m);
});
