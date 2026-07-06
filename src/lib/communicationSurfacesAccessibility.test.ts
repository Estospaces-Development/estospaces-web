import { readFileSync } from 'node:fs';
import { resolve } from 'node:path';
import test from 'node:test';
import assert from 'node:assert/strict';

const readSource = (path: string) => readFileSync(resolve(process.cwd(), path), 'utf8');

test('communication surfaces hide inactive payment booking actions and label client filters', () => {
  const userBookings = readSource('src/pages/user/bookings/page.tsx');
  const managerClients = readSource('src/pages/manager/clients/page.tsx');
  const select = readSource('src/components/ui/Select.tsx');

  assert.doesNotMatch(userBookings, /Open payment details for booking/);
  assert.doesNotMatch(userBookings, /CreditCard/);
  assert.match(managerClients, /ariaLabel="Filter clients by status"/);
  assert.match(managerClients, /\{ value: '', label: 'All Statuses' \}/);
  assert.match(managerClients, /placeholder=""/);
  assert.match(select, /ariaLabel\?: string;/);
  assert.match(select, /aria-label=\{ariaLabel\}/);
});

test('launch UI does not advertise inactive payments or invoice workspaces', () => {
  const app = readSource('src/App.tsx');
  const userBookings = readSource('src/pages/user/bookings/page.tsx');
  const promiseBanner = readSource('src/components/dashboard/PromiseBanner.tsx');
  const contactPage = readSource('src/pages/public/contact/page.tsx');
  const emptyState = readSource('src/components/ui/EmptyState.tsx');
  const supportCenter = readSource('src/components/support/SupportCenter.tsx');
  const adminDashboard = readSource('src/pages/admin/dashboard/page.tsx');

  assert.match(app, /path="billing\/\*" element=\{<Navigate to="\/manager\/contracts" replace \/>\}/);
  assert.match(app, /path="dashboard\/payments\/\*" element=\{<Navigate to="\/user\/dashboard\/contracts" replace \/>\}/);
  assert.doesNotMatch(app, /^\s*const ManagerBilling = lazyPage/m);
  assert.doesNotMatch(app, /^\s*const UserPayments = lazyPage/m);
  assert.doesNotMatch(userBookings, /Total Paid/);
  assert.doesNotMatch(promiseBanner, /Initial payment|deposit cleared/i);
  assert.doesNotMatch(contactPage, /Payment Issue|value="payment"/);
  assert.doesNotMatch(emptyState, /No Payment History|billing begins/i);
  assert.doesNotMatch(supportCenter, /search, payment, and booking/i);
  assert.doesNotMatch(adminDashboard, /search, payment, and booking/i);
});

test('public contact route is ready without a lazy route chunk', () => {
  const app = readSource('src/App.tsx');

  assert.match(app, /import ContactPage from '\.\/pages\/public\/contact\/page';/);
  assert.doesNotMatch(app, /const ContactPage = lazyPage\(\(\) => import\('\.\/pages\/public\/contact\/page'\)\);/);
  assert.match(app, /<Route path="\/contact" element=\{<ContactPage \/>\} \/>/);
});

test('launch UI does not advertise inactive virtual tour workflows', () => {
  const propertyCard = readSource('src/components/dashboard/PropertyCard.tsx');
  const userSearch = readSource('src/pages/user/search/page.tsx');
  const userPropertyDetail = readSource('src/pages/user/properties/[id]/page.tsx');
  const managerPropertyDetail = readSource('src/pages/manager/dashboard/properties/[id]/page.tsx');
  const managerAddProperty = readSource('src/pages/manager/dashboard/properties/add/page.tsx');
  const adminPropertyDetail = readSource('src/pages/admin/properties/[id]/page.tsx');

  for (const source of [
    propertyCard,
    userSearch,
    userPropertyDetail,
    managerPropertyDetail,
    managerAddProperty,
    adminPropertyDetail,
  ]) {
    assert.doesNotMatch(source, /Virtual Tour|virtual tour|VIRTUAL TOUR|3D virtual tour/);
    assert.doesNotMatch(source, /VirtualTourRequestPanel/);
  }

  assert.doesNotMatch(userPropertyDetail, /immersive viewer|Open immersive view|Immersive gallery/);
  assert.match(userPropertyDetail, /Open full-screen gallery/);
});

test('launch search and broker surfaces use country-aware India and UK location context', () => {
  const sources = [
    readSource('src/pages/user/search/page.tsx'),
    readSource('src/components/ui/SearchBar.tsx'),
    readSource('src/components/dashboard/BrokerRequestWidget.tsx'),
    readSource('src/components/dashboard/NearbyAgenciesList.tsx'),
    readSource('src/lib/geoMarket.ts'),
    readSource('src/lib/useGeoMarket.ts'),
    readSource('src/lib/launchLocale.ts'),
  ].join('\\n');

  assert.match(sources, /useUserGeoMarket/);
  assert.match(sources, /useGeoMarket/);
  assert.match(sources, /getLaunchLocationCodeLabel/);
  assert.match(sources, /getLaunchLocationCodePlaceholder/);
  assert.match(sources, /isValidLaunchLocationCodeForCountry/);
  assert.match(sources, /LAUNCH_COUNTRY_CODE/);
  assert.match(sources, /UK_COUNTRY_CODE/);
  assert.match(sources, /Please enter a valid 6-digit Indian PIN code/);
  assert.match(sources, /Please enter a valid UK postcode/);
});

test('profile and document surfaces reflect logged-in country context', () => {
  const sources = [
    readSource('src/pages/user/dashboard/profile/page.tsx'),
    readSource('src/pages/manager/profile/page.tsx'),
    readSource('src/pages/admin/profile/page.tsx'),
    readSource('src/components/dashboard/VerificationSection.tsx'),
    readSource('src/components/fast-track/FastTrackWorkspace.tsx'),
    readSource('src/pages/user/virtual-storage/page.tsx'),
    readSource('src/lib/countryDocumentGuidance.ts'),
  ].join('\\n');

  assert.match(sources, /useUserGeoMarket/);
  assert.match(sources, /getCountryDocumentGuidance/);
  assert.ok(sources.includes('Aadhaar, PAN/Form 60'));
  assert.match(sources, /British or Irish passport/);
  assert.match(sources, /right-to-rent share code/);
  assert.match(sources, /locationCodeLabel/);
  assert.match(sources, /locationCodePlaceholder/);
});

test('user compact search submits Enter through the same search path as the button', () => {
  const searchBar = readSource('src/components/ui/SearchBar.tsx');

  assert.match(searchBar, /const handleCompactKeywordKeyDown = \(e: React\.KeyboardEvent<HTMLInputElement>\) =>/);
  assert.match(searchBar, /if \(e\.key !== 'Enter'\) return;/);
  assert.match(searchBar, /const nextFilters: SearchFilters = \{ \.\.\.filters, keyword: e\.currentTarget\.value, location: '' \};/);
  assert.match(searchBar, /handleSearch\(undefined, nextFilters\);/);
  assert.match(searchBar, /onKeyDown=\{handleCompactKeywordKeyDown\}/);
});

test('mobile user header keeps search and profile controls within the viewport budget', () => {
  const userHeader = readSource('src/components/layout/UserHeader.tsx');
  const searchBar = readSource('src/components/ui/SearchBar.tsx');

  assert.match(userHeader, /className="flex h-full items-center justify-between gap-2 px-3 sm:px-4 lg:px-6"/);
  assert.match(userHeader, /className="mx-2 min-w-0 flex-1 sm:mx-4 md:mx-8 md:max-w-xl"/);
  assert.match(userHeader, /className="flex shrink-0 items-center gap-1\.5 sm:gap-4"/);
  assert.match(userHeader, /className=\{`hidden text-white transition-transform dark:text-gray-200 sm:block/);
  assert.match(searchBar, /className=\{`flex min-w-0 items-center gap-2 \$\{className\}`\}/);
  assert.match(searchBar, /className="relative min-w-0 flex-1"/);
  assert.match(searchBar, /className="flex h-10 w-10 shrink-0 items-center justify-center rounded-lg bg-primary px-0/);
  assert.match(searchBar, /<span className="sr-only sm:hidden">Search properties<\/span>/);
});

test('communication surfaces keep small status text at readable contrast', () => {
  const userNotifications = readSource('src/pages/user/dashboard/notifications/page.tsx');
  const adminNotifications = readSource('src/pages/admin/notifications/page.tsx');
  const userBookings = readSource('src/pages/user/bookings/page.tsx');
  const activitySubnav = readSource('src/components/layout/UserActivitySubnav.tsx');

  assert.match(userNotifications, /text-emerald-700 dark:text-emerald-300/);
  assert.match(adminNotifications, /text-emerald-700 dark:text-emerald-300/);
  assert.match(userBookings, /bg-green-50 text-green-700/);
  assert.match(userBookings, /bg-yellow-50 text-yellow-800/);
  assert.match(userBookings, /bg-red-50 text-red-700/);
  assert.match(userBookings, /rounded-2xl bg-red-50 py-4 text-xs font-black uppercase tracking-widest text-red-700/);
  assert.match(activitySubnav, /text-orange-800 dark:text-orange-100/);
});

test('community composer exposes modal dialog semantics', () => {
  const createPostModal = readSource('src/components/community/CreatePostModal.tsx');

  assert.match(createPostModal, /role="dialog"/);
  assert.match(createPostModal, /aria-modal="true"/);
  assert.match(createPostModal, /aria-labelledby="create-post-title"/);
  assert.match(createPostModal, /id="create-post-title"/);
  assert.doesNotMatch(createPostModal, /disabled=\{!isFormReady\}/);
  assert.match(createPostModal, /id="post-title-error" role="alert"/);
  assert.match(createPostModal, /id="post-content-error" role="alert"/);
  assert.match(createPostModal, /text-red-700 dark:text-red-300/);
  assert.match(createPostModal, /aria-describedby=\{errors\.title \? 'post-title-error' : undefined\}/);
  assert.match(createPostModal, /aria-pressed=\{tag === tagOption\.value\}/);
  assert.doesNotMatch(createPostModal, /id="post-title"[\s\S]*?required[\s\S]*?maxLength=\{120\}/);
  assert.doesNotMatch(createPostModal, /id="content"[\s\S]*?required[\s\S]*?maxLength=\{4000\}/);
});

test('community comments panel exposes modal dialog semantics', () => {
  const commentsModal = readSource('src/components/community/CommentsModal.tsx');

  assert.match(commentsModal, /role="dialog"/);
  assert.match(commentsModal, /aria-modal="true"/);
  assert.match(commentsModal, /aria-labelledby="community-comments-title"/);
  assert.match(commentsModal, /id="community-comments-title"/);
  assert.match(commentsModal, /const comments = post\.comments \|\| \[\];/);
});

test('community moderation dropdown uses valid menu semantics', () => {
  const postCard = readSource('src/components/community/CommunityPostCard.tsx');

  assert.match(postCard, /<div role="menu"/);
  assert.equal((postCard.match(/role="menuitem"/g) || []).length, 5);
});

test('community surfaces avoid low-contrast active and helper text tokens', () => {
  const communityPage = readSource('src/pages/manager/community/page.tsx');
  const filterBar = readSource('src/components/community/CommunityFilterBar.tsx');
  const stats = readSource('src/components/community/CommunityStats.tsx');
  const postCard = readSource('src/components/community/CommunityPostCard.tsx');
  const createPostModal = readSource('src/components/community/CreatePostModal.tsx');
  const commentsModal = readSource('src/components/community/CommentsModal.tsx');

  assert.match(communityPage, /bg-indigo-800 hover:bg-indigo-900/);
  assert.match(filterBar, /bg-indigo-800 text-white/);
  assert.match(stats, /text-sm font-medium text-gray-800 dark:text-gray-300/);
  assert.match(postCard, /text-indigo-900/);
  assert.match(postCard, /text-gray-900 dark:text-gray-200/);
  assert.match(createPostModal, /bg-indigo-800 hover:bg-indigo-900/);
  assert.match(commentsModal, /bg-indigo-800 hover:bg-indigo-900/);
});

test('community page normalizes posts returned by the API before rendering fresh records', () => {
  const communityPage = readSource('src/pages/manager/community/page.tsx');

  assert.match(communityPage, /data-testid="community-page"/);
  assert.match(communityPage, /const normalizeCommunityPost = \(post: CommunityPost\): CommunityPost =>/);
  assert.match(communityPage, /comments: post\.comments \|\| \[\]/);
  assert.match(communityPage, /setPosts\(data\.map\(normalizeCommunityPost\)\)/);
  assert.match(communityPage, /setPosts\(prev => \[normalizeCommunityPost\(data\), \.\.\.prev\]\)/);
});
