import assert from 'node:assert/strict';
import { readFileSync } from 'node:fs';
import test from 'node:test';

const readSource = (path: string) => readFileSync(new URL(path, import.meta.url), 'utf8');

const mobileNavigation = readSource('../components/layout/RoleMobileNavigation.tsx');
const managerLayout = readSource('../components/layout/ManagerLayoutClient.tsx');
const adminLayout = readSource('../components/layout/AdminLayoutClient.tsx');
const userLayout = readSource('../components/layout/UserLayoutClient.tsx');
const managerHeader = readSource('../components/layout/Header.tsx');
const userHeader = readSource('../components/layout/UserHeader.tsx');
const horizontalNavigation = readSource('../components/layout/HorizontalNavigation.tsx');
const globalStyles = readSource('../globals.css');
const applicationCard = readSource('../components/dashboard/applications/ApplicationCard.tsx');
const managerApplicationCard = readSource('../components/manager/applications/ApplicationCard.tsx');
const applicationCardSkeleton = readSource('../components/dashboard/applications/ApplicationCardSkeleton.tsx');
const communityPostCard = readSource('../components/community/CommunityPostCard.tsx');
const communityFilterBar = readSource('../components/community/CommunityFilterBar.tsx');
const supportCenter = readSource('../components/support/SupportCenter.tsx');
const adminProperties = readSource('../pages/admin/properties/page.tsx');
const adminUsers = readSource('../pages/admin/users/page.tsx');
const userActivitySubnav = readSource('../components/layout/UserActivitySubnav.tsx');
const verificationQueue = readSource('../components/verification/UserVerificationQueue.tsx');
const applicationTimeline = readSource('../components/dashboard/ApplicationTimelineWidget.tsx');
const userContracts = readSource('../pages/user/dashboard/contracts/page.tsx');
const userDashboard = readSource('../pages/user/dashboard/DashboardClient.tsx');
const searchBar = readSource('../components/ui/SearchBar.tsx');
const messageInboxFab = readSource('../components/layout/MessageInboxFab.tsx');
const managerDashboard = readSource('../pages/manager/dashboard/page.tsx');
const managerTabBar = readSource('../components/dashboard/TabBar.tsx');
const managerAnalytics = readSource('../pages/manager/analytics/page.tsx');
const statCard = readSource('../components/dashboard/StatCard.tsx');
const adminDashboard = readSource('../pages/admin/dashboard/page.tsx');
const adminProfile = readSource('../pages/admin/profile/page.tsx');
const toast = readSource('../components/ui/Toast.tsx');
const fastTrackLayout = readSource('../components/fast-track/FastTrackWorkspaceLayout.tsx');
const fastTrackWorkspace = readSource('../components/fast-track/FastTrackWorkspace.tsx');
const propertyForm = readSource('../pages/manager/dashboard/properties/add/page.tsx');

test('all authenticated roles use a mobile app content shell with safe bottom navigation space', () => {
  assert.match(userLayout, /mobile-app-content/);
  assert.match(managerLayout, /mobile-app-content/);
  assert.match(adminLayout, /mobile-app-content/);
  assert.match(managerLayout, /pb-24/);
  assert.match(adminLayout, /pb-24/);
});

test('manager and admin expose app-like mobile bottom navigation without changing desktop chrome', () => {
  assert.match(mobileNavigation, /data-mobile-role-navigation=\{role\}/);
  assert.match(mobileNavigation, /lg:hidden/);
  assert.match(mobileNavigation, /env\(safe-area-inset-bottom\)/);
  assert.match(mobileNavigation, /min-h-14/);
  assert.match(managerLayout, /RoleMobileNavigation role="manager"/);
  assert.match(adminLayout, /RoleMobileNavigation role="admin"/);
  assert.match(mobileNavigation, /activePaths: \['\/manager\/clients'\]/);
  assert.match(mobileNavigation, /activePaths: \['\/admin\/user-management'\]/);
  assert.match(mobileNavigation, /label: 'Properties', mobileLabel: 'Listings'/);
  assert.match(mobileNavigation, /label: 'Fast Track', mobileLabel: '24h'/);
  assert.match(mobileNavigation, /item\.mobileLabel === item\.label[\s\S]*item\.mobileLabel/);
  assert.match(mobileNavigation, /\{item\.mobileLabel\}/);
  assert.doesNotMatch(mobileNavigation, /truncate">\{item\.label\}/);
});

test('mobile headers preserve context while compacting the user wordmark', () => {
  assert.match(managerHeader, /getManagerPageTitle\(pathname\)/);
  assert.match(userHeader, /min-\[360px\]:inline/);
  assert.match(userHeader, /hidden h-11 min-w-11 max-w-full/);
});

test('user bottom navigation uses concise labels that remain readable on 320px phones', () => {
  assert.match(horizontalNavigation, /mobileLabel: "Home"/);
  assert.match(horizontalNavigation, /mobileLabel: "Chat"/);
  assert.match(horizontalNavigation, /mobileLabel: "Activity"/);
  assert.match(horizontalNavigation, /\{item\.mobileLabel\}/);
  assert.doesNotMatch(horizontalNavigation, /truncate whitespace-nowrap">\{item\.label\}/);
});

test('mobile-only global safeguards prevent common overflow and input zoom failures', () => {
  assert.match(globalStyles, /@media \(max-width: 639px\)/);
  assert.match(globalStyles, /overflow-x: clip/);
  assert.match(globalStyles, /font-size: 16px/);
  assert.match(globalStyles, /role-workspace-content table/);
  assert.match(globalStyles, /scroll-padding-bottom/);
  assert.match(globalStyles, /min-height: 44px/);
  assert.match(globalStyles, /scroll-snap-type: x proximity/);
  assert.match(globalStyles, /role-workspace-content h1/);
  assert.match(globalStyles, /font-size: clamp\(1\.5rem, 7vw, 1\.875rem\)/);
  assert.match(globalStyles, /role-workspace-content h2/);
  assert.match(globalStyles, /font-size: clamp\(1\.25rem, 5\.8vw, 1\.5rem\)/);
});

test('notification dismiss controls remain safe touch targets across every role', () => {
  assert.match(toast, /min-h-11 min-w-11/);
  assert.match(toast, /aria-label="Close notification"/);
});

test('admin profile refreshes the authenticated record and only submits fields the admin changed', () => {
  assert.match(adminProfile, /getAuthenticatedProfile\(\)/);
  assert.match(adminProfile, /initialFormDataRef/);
  assert.match(adminProfile, /formData\.phone !== initialFormData\.phone/);
  assert.doesNotMatch(adminProfile, /phone: formData\.phone,/);
});

test('dense record surfaces use dedicated mobile composition instead of squeezed desktop rows', () => {
  assert.match(applicationCard, /flex-col min-\[480px\]:flex-row/);
  assert.match(applicationCard, /h-44 w-full/);
  assert.match(applicationCardSkeleton, /flex-col min-\[480px\]:flex-row/);
  assert.match(communityPostCard, /flex min-w-0 flex-col gap-3 sm:flex-row/);
  assert.match(communityPostCard, /min-h-11 min-w-11/);
  assert.match(communityFilterBar, /grid w-full min-w-0 grid-cols-1/);
});

test('manager application card actions remain contained on narrow phones', () => {
  assert.match(managerApplicationCard, /flex flex-col font-outfit min-\[480px\]:flex-row/);
  assert.match(managerApplicationCard, /h-44 w-full flex-shrink-0 min-\[480px\]:h-auto/);
  assert.match(managerApplicationCard, /grid-cols-1[^\n]+min-\[360px\]:grid-cols-2/);
  assert.match(managerApplicationCard, /flex min-w-0 flex-col items-stretch gap-3/);
  assert.match(managerApplicationCard, /flex min-w-0 flex-wrap items-baseline gap-x-1/);
  assert.match(managerApplicationCard, /max-w-full break-words text-base/);
  assert.match(managerApplicationCard, /grid-cols-\[44px_minmax\(0,1fr\)\]/);
  assert.match(managerApplicationCard, /min-h-11 min-w-11/);
  assert.match(managerApplicationCard, /min-h-11 min-w-0 items-center justify-center/);
});

test('support and admin registry controls reflow into full-width mobile actions', () => {
  assert.match(supportCenter, /min-w-0 max-w-full space-y-6/);
  assert.match(supportCenter, /flex min-w-0 flex-col gap-3/);
  assert.match(adminProperties, /flex w-full min-w-0 flex-col gap-3/);
  assert.match(adminProperties, /min-h-11 w-full items-center justify-center/);
  assert.match(adminUsers, /data-mobile-table="cards"/);
  assert.match(adminUsers, /hidden max-w-full overflow-x-auto[^\n]+md:block/);
});

test('user activity navigation becomes a compact mobile carousel instead of a tall desktop grid', () => {
  assert.match(userActivitySubnav, /snap-x snap-mandatory/);
  assert.match(userActivitySubnav, /min-w-\[150px\] snap-start/);
  assert.match(userActivitySubnav, /mobileLabel: "Documents"/);
  assert.match(userActivitySubnav, /whitespace-nowrap text-sm font-bold sm:hidden/);
  assert.match(userActivitySubnav, /hidden truncate text-xs sm:block/);
  assert.match(userActivitySubnav, /sm:grid sm:grid-cols-2/);
});

test('manager dashboard avoids duplicate phone navigation while preserving desktop tabs', () => {
  assert.match(managerTabBar, /hidden overflow-x-auto[^"]+sm:block/);
  assert.match(managerTabBar, /Overview/);
  assert.match(managerTabBar, /Analytics/);
});

test('application summary cards preserve complete metric labels on narrow phones', () => {
  const applicationsPage = readSource('../pages/user/applications/page.tsx');

  assert.match(applicationsPage, /data-mobile-application-summary/);
  assert.match(applicationsPage, /grid-cols-2 gap-3/);
  assert.match(applicationsPage, /mobile-summary-label/);
  assert.match(applicationsPage, /min-\[360px\]:p-4 sm:p-5/);
  assert.match(globalStyles, /\.role-workspace-content \.mobile-summary-label[\s\S]*overflow-wrap: normal !important;[\s\S]*word-break: normal !important;/);
});

test('shared verification queue stacks search, sort, and refresh controls on narrow phones', () => {
  assert.match(verificationQueue, /grid w-full min-w-0 grid-cols-1 gap-3 sm:flex/);
  assert.match(verificationQueue, /w-full rounded-2xl[^\n]+sm:w-64/);
  assert.match(verificationQueue, /min-h-12 w-full[^\n]+sm:w-auto/);
});

test('small-phone dashboard skeletons and contract cards reflow without changing desktop composition', () => {
  assert.match(applicationTimeline, /min-w-0 flex-1 space-y-3/);
  assert.match(applicationTimeline, /h-6 w-full max-w-48/);
  assert.match(applicationTimeline, /flex snap-x gap-1 overflow-x-auto[^\n]+sm:flex-wrap sm:overflow-visible/);
  assert.match(applicationTimeline, /inline-flex shrink-0 items-center[^\n]+whitespace-nowrap/);
  assert.match(applicationTimeline, /grid grid-cols-\[44px_minmax\(0,1fr\)\][^\n]+sm:flex sm:gap-5/);
  assert.match(applicationTimeline, /flex flex-col gap-1 pr-6[^\n]+sm:flex-row/);
  assert.match(userContracts, /flex min-w-0 flex-col gap-4 min-\[380px\]:flex-row/);
  assert.match(userContracts, /h-40 w-full[^\n]+min-\[380px\]:h-24 min-\[380px\]:w-24/);
  assert.match(userContracts, /flex min-w-0 flex-col items-start gap-2 min-\[380px\]:flex-row/);
});

test('mobile dashboards use compact app-native hierarchy while desktop breakpoints stay intact', () => {
  assert.match(userDashboard, /min-h-0[^\n]+md:min-h-\[480px\][^\n]+lg:min-h-\[540px\]/);
  assert.match(userDashboard, /data-mobile-primary-task/);
  assert.match(userDashboard, /Find a home/);
  assert.match(userDashboard, /primaryLabel\.trim\(\)\.toLowerCase\(\) !== 'find a home'/);
  assert.match(userDashboard, /id="greeting-section" className="hidden/);
  assert.match(userDashboard, /mobile-filter-rail[^\n]+hidden[^\n]+sm:flex/);
  assert.match(userDashboard, /hidden rounded-\[24px\][^\n]+lg:block/);
  assert.match(searchBar, /grid min-w-0 max-w-full grid-cols-3[^\n]+sm:inline-flex sm:w-auto/);
  assert.match(searchBar, /min-w-0 w-full bg-transparent[^\n]+placeholder-gray-400/);
  assert.match(messageInboxFab, /hidden[^\n]+md:inline-flex/);
  assert.match(managerDashboard, /grid grid-cols-2 gap-3[^\n]+lg:grid-cols-4/);
  assert.match(statCard, /rounded-2xl sm:rounded-3xl[^\n]+p-3\.5 sm:p-6/);
  assert.match(adminDashboard, /grid grid-cols-2 gap-3[^\n]+lg:grid-cols-4/);
});

test('focused mobile workflows disclose one current task before secondary tools', () => {
  assert.match(fastTrackLayout, /Step \{selectedIndex \+ 1\} of \{items\.length\}/);
  assert.match(fastTrackLayout, /aria-label="Choose fast-track stage"/);
  assert.match(fastTrackLayout, /min-\[360px\]:flex-row/);
  assert.match(fastTrackLayout, /hidden gap-1\.5 overflow-x-auto pb-1 sm:flex/);
  assert.match(fastTrackWorkspace, /data-mobile-current-task/);
  assert.match(fastTrackWorkspace, /Open case tools/);
  assert.match(propertyForm, /Step \{currentStep\} of \{steps\.length\}/);
  assert.match(propertyForm, /aria-label="Choose property form step"/);
  assert.match(propertyForm, /property-audit-details/);
  assert.match(propertyForm, /Listing notes and audit/);
});

test('manager analytics uses deliberate 48px period and export controls on touch screens', () => {
  assert.equal((managerAnalytics.match(/min-h-12 px-4 py-2/g) || []).length, 2);
  assert.match(managerAnalytics, /min-h-12 min-w-12 items-center justify-center/);
  assert.equal((managerAnalytics.match(/style=\{\{ minHeight: 48 \}\}/g) || []).length, 2);
  assert.match(managerAnalytics, /style=\{\{ minHeight: 48, minWidth: 48 \}\}/);
});
