import assert from 'node:assert/strict';
import { readFileSync } from 'node:fs';
import test from 'node:test';
import { resolve } from 'node:path';

const root = process.cwd();
const discoverPage = readFileSync(
    resolve(root, 'src/pages/user/dashboard/discover/page.tsx'),
    'utf8',
);
const propertyCard = readFileSync(
    resolve(root, 'src/components/dashboard/PropertyCard.tsx'),
    'utf8',
);
const propertyDetailPage = readFileSync(
    resolve(root, 'src/pages/user/properties/[id]/page.tsx'),
    'utf8',
);
const fastTrackRequestFlow = readFileSync(
    resolve(root, 'src/lib/propertyFastTrackRequest.ts'),
    'utf8',
);
const nearbyPropertiesMap = readFileSync(
    resolve(root, 'src/components/dashboard/NearbyPropertiesMap.tsx'),
    'utf8',
);

test('discover page uses clear task-led copy and pressed-state controls', () => {
    assert.match(discoverPage, /Homes on Estospaces/);
    assert.match(discoverPage, /Find a home that fits your next move/);
    assert.match(discoverPage, /Narrow your search/);
    assert.match(discoverPage, /aria-pressed=\{activeTab === value\}/);
    assert.match(discoverPage, /aria-pressed=\{viewMode === 'grid'\}/);
    assert.match(discoverPage, /aria-pressed=\{viewMode === 'map'\}/);
});

test('discover listing tabs are not reset by a new search params object with the same URL', () => {
    assert.match(discoverPage, /const searchParamSnapshot = searchParams\.toString\(\)/);
    assert.match(discoverPage, /\[searchParamSnapshot, setActiveTab\]/);
    assert.doesNotMatch(discoverPage, /\[searchParams, setActiveTab\]/);
});

test('discover property navigation restores browser search state and scroll position', () => {
    assert.match(discoverPage, /readPropertySearchReturnState\(window\.sessionStorage, DISCOVER_PATH\)/);
    assert.match(discoverPage, /savePropertySearchReturnState\(window\.sessionStorage/);
    assert.match(discoverPage, /clearPropertySearchReturnState\(window\.sessionStorage, DISCOVER_PATH\)/);
    assert.match(discoverPage, /selectDiscoverSearchSource\(/);
    assert.match(discoverPage, /selection\.discardCachedSearch/);
    assert.match(discoverPage, /markDiscoverReturnHistoryState\(window\.history\.state\)/);
    assert.match(discoverPage, /isDiscoverReturnHistoryState\(window\.history\.state\)/);
    assert.match(discoverPage, /consumeDiscoverReturnHistoryState\(window\.history\.state\)/);
    assert.match(discoverPage, /cachedDiscoverSearchRef\.current\?\.search \|\| searchParamSnapshot/);
    assert.match(discoverPage, /openPropertyFromDiscover\(\{ id: suggestion\.id \}\)/);
    assert.match(discoverPage, /onViewDetails=\{openPropertyFromDiscover\}/);
    assert.match(discoverPage, /onStartFastTrack=\{requestFastTrackFromDiscover\}/);
    assert.match(discoverPage, /backTo: discoverReturnPath/);
    assert.match(discoverPage, /backState: markDiscoverReturnHistoryState\(null\)/);
    assert.match(propertyDetailPage, /navigate\(navigationState\.backTo, \{ state: navigationState\.backState \}\)/);
});

test('discover Fast Track action submits the request instead of opening property details', () => {
    assert.match(discoverPage, /requestDirectPropertyFastTrack\(\{/);
    assert.match(discoverPage, /writeFastTrackRequestPending\(window\.localStorage/);
    assert.match(discoverPage, /The property manager has been notified/);
    assert.doesNotMatch(discoverPage, /navigate\(`\/user\/properties\/\$\{property\.id\}\?fast-track=1`/);
    assert.match(fastTrackRequestFlow, /await dependencies\.createLead\(property\.id\)/);
    assert.match(fastTrackRequestFlow, /await dependencies\.requestFastTrack\(userRequest\)/);
    assert.match(propertyCard, /disabled=\{fastTrackStatus !== 'idle'\}/);
    assert.match(nearbyPropertiesMap, /disabled=\{selectedFastTrackStatus !== 'idle'\}/);
});

test('discover result summary is compact, honest, and responsive', () => {
    assert.match(discoverPage, /data-discover-results-summary/);
    assert.match(discoverPage, /Available homes/);
    assert.match(discoverPage, /Countries represented in these results/);
    assert.doesNotMatch(discoverPage, /Markets represented in these results/);
    assert.match(discoverPage, /\{group\.label\} · \{group\.count\} shown/);
    assert.doesNotMatch(discoverPage, /Country-aware groups/);
    assert.match(discoverPage, /sm:flex-row sm:items-center sm:justify-between/);
});

test('discover cards preserve the flow with a clear primary and secondary action', () => {
    assert.match(discoverPage, /appearance="discovery"/);
    assert.match(propertyCard, /appearance\?: 'default' \| 'discovery'/);
    assert.match(propertyCard, /\{isDiscoveryCard \? 'View home' : 'View Details'\}/);
    assert.match(propertyCard, /isDiscoveryCard[\s\S]*\? 'Request Fast Track'[\s\S]*: 'Request 24-Hour Fast Track'/);
    assert.match(propertyCard, /border border-orange-200 bg-orange-50/);
    assert.match(propertyCard, /min-h-12 w-full rounded-xl bg-orange-600/);
    assert.match(propertyCard, /isDiscoveryCard \? \([\s\S]*?\{viewDetailsAction\}[\s\S]*?\{fastTrackAction\}/);
    assert.doesNotMatch(propertyCard, /order-[12]/);
});

test('discover layout reflows deliberately across mobile tablet and desktop', () => {
    assert.match(discoverPage, /grid grid-cols-1 gap-5 sm:grid-cols-2 xl:grid-cols-4 xl:gap-6/);
    assert.match(discoverPage, /max-w-\[90rem\]/);
    assert.match(propertyCard, /h-52 sm:h-56/);
    assert.match(propertyCard, /h-11 w-11/);
    assert.match(propertyCard, /flex flex-wrap items-center gap-x-4 gap-y-2/);
});

test('compact property cards keep image controls reachable and overlays collision-safe', () => {
    assert.match(propertyCard, /Show previous image[\s\S]*?h-11 w-11/);
    assert.match(propertyCard, /Show next image[\s\S]*?h-11 w-11/);
    assert.match(propertyCard, /Show property image[\s\S]*?inline-flex h-11 w-11/);
    assert.match(propertyCard, /pointer-events-none absolute inset-x-3 top-3 flex items-start justify-between gap-2/);
    assert.match(propertyCard, /pointer-events-auto ml-auto flex shrink-0 gap-2/);
    assert.match(propertyCard, /absolute bottom-3 right-3 flex h-11 min-w-11/);
    assert.doesNotMatch(propertyCard, /right-20 flex flex-col/);
});
