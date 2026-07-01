import test from 'node:test';
import assert from 'node:assert/strict';
import { readFileSync } from 'node:fs';
import { resolve } from 'node:path';
import { buildPropertyTypeOptions } from '../../lib/propertyTypeOptions';

const source = readFileSync(resolve(process.cwd(), 'src/components/ui/SearchBar.tsx'), 'utf8');
const publicSearchSource = readFileSync(resolve(process.cwd(), 'src/pages/user/search/page.tsx'), 'utf8');
const userDashboardSource = readFileSync(resolve(process.cwd(), 'src/pages/user/dashboard/DashboardClient.tsx'), 'utf8');

test('dashboard type options exclude transaction values from API filters', () => {
    assert.deepEqual(buildPropertyTypeOptions(['rent', 'apartment', 'sale', 'villa', 'Apartment']), [
        { value: '', label: 'All Types' },
        { value: 'apartment', label: 'Apartment' },
        { value: 'villa', label: 'Villa' },
    ]);
});

test('dashboard type listbox opens upward instead of relying on native select placement', () => {
    assert.match(source, /aria-haspopup="listbox"/);
    assert.match(source, /role="listbox"/);
    assert.match(source, /bottom-full/);
    assert.doesNotMatch(source, /filterOptions\.property_types\.map\(t => <option/);
});

test('public search property type dropdown uses cleaned upward-opening options', () => {
    assert.match(publicSearchSource, /buildPropertyTypeOptions\(filterOptions\?\.property_types\)/);
    assert.match(publicSearchSource, /id="public-search-property-type-listbox"/);
    assert.match(publicSearchSource, /bottom-full/);
    assert.doesNotMatch(publicSearchSource, /filterOptions\?\.property_types \|\| \[\]\)\.map/);
});

test('user dashboard search uses the shared hero search type control', () => {
    assert.match(userDashboardSource, /<SearchBar[\s\S]*variant="hero"/);
    assert.match(userDashboardSource, /onSearch=\{handleDashboardSearch\}/);
});
