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

test('location suggestions keep long dashboard results contained', () => {
    assert.match(source, /const suggestionMenuClassName = .*min-w-\[min\(22rem,calc\(100vw-2rem\)\)\]/);
    assert.match(source, /const suggestionOptionClassName = .*min-w-0/);
    assert.match(source, /const suggestionLabelClassName = .*min-w-0 flex-1/);
    assert.match(source, /const suggestionTextClassName = "truncate"/);
    assert.match(source, /const suggestionTypeClassName = "shrink-0/);
});

test('user dashboard search uses the shared hero search type control', () => {
    assert.match(userDashboardSource, /<SearchBar[\s\S]*variant="hero"/);
    assert.match(userDashboardSource, /onSearch=\{handleDashboardSearch\}/);
});

test('user dashboard hero search defaults to all sale and rental homes', () => {
    assert.match(userDashboardSource, /listingType: 'all'/);
    assert.match(source, /\{ label: 'All', value: 'all' \}/);
    assert.match(source, /\{ label: 'Buy', value: 'sale' \}/);
    assert.match(source, /\{ label: 'Rent', value: 'rent' \}/);
    assert.match(userDashboardSource, /dashboardSearchFilters\.listingType === 'all'\s*\?\s*undefined/);
    assert.doesNotMatch(userDashboardSource, /listingType: selectedPropertyType === 'rent' \? 'rent' : 'sale'/);
});
