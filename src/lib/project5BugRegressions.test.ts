import test from 'node:test';
import assert from 'node:assert/strict';
import { readFileSync } from 'node:fs';
import { resolve } from 'node:path';
import {
    normalizeLeadScoreInputValue,
    serializeLeadScoreInputValue,
} from './leadScoreInput';
import { toDiscoverNearbyMapProperties } from './discoverMap';

const root = process.cwd();
const managerTracker = readFileSync(resolve(root, 'src/components/dashboard/BrokerResponseWidget.tsx'), 'utf8');
const dashboardLeadModal = readFileSync(resolve(root, 'src/components/dashboard/AddLeadModal.tsx'), 'utf8');
const sharedLeadModal = readFileSync(resolve(root, 'src/components/ui/AddLeadModal.tsx'), 'utf8');
const userContractsPage = readFileSync(resolve(root, 'src/pages/user/dashboard/contracts/page.tsx'), 'utf8');
const userViewingsPage = readFileSync(resolve(root, 'src/pages/user/dashboard/viewings/page.tsx'), 'utf8');
const managerAppointmentsPage = readFileSync(resolve(root, 'src/pages/manager/appointments/page.tsx'), 'utf8');
const managerContractsPage = readFileSync(resolve(root, 'src/pages/manager/contracts/page.tsx'), 'utf8');
const userApplicationFilters = readFileSync(resolve(root, 'src/components/dashboard/applications/ApplicationFilters.tsx'), 'utf8');
const managerApplicationFilters = readFileSync(resolve(root, 'src/components/manager/applications/ApplicationFilters.tsx'), 'utf8');
const managerApplicationStatusTracker = readFileSync(resolve(root, 'src/components/manager/applications/StatusTracker.tsx'), 'utf8');
const userApplicationStatusTracker = readFileSync(resolve(root, 'src/components/dashboard/applications/StatusTracker.tsx'), 'utf8');
const adminHeader = readFileSync(resolve(root, 'src/components/layout/AdminHeader.tsx'), 'utf8');
const adminDashboardPage = readFileSync(resolve(root, 'src/pages/admin/dashboard/page.tsx'), 'utf8');
const adminVerificationsPage = readFileSync(resolve(root, 'src/pages/admin/verifications/page.tsx'), 'utf8');
const userVerificationQueue = readFileSync(resolve(root, 'src/components/verification/UserVerificationQueue.tsx'), 'utf8');
const adminReviewsPage = readFileSync(resolve(root, 'src/pages/admin/reviews/page.tsx'), 'utf8');
const conversationList = readFileSync(resolve(root, 'src/components/dashboard/messaging/ConversationList.tsx'), 'utf8');
const fastTrackWorkspaceLayout = readFileSync(resolve(root, 'src/components/fast-track/FastTrackWorkspaceLayout.tsx'), 'utf8');
const userPropertyDetailPage = readFileSync(resolve(root, 'src/pages/user/properties/[id]/page.tsx'), 'utf8');
const applicationsContext = readFileSync(resolve(root, 'src/contexts/ApplicationsContext.tsx'), 'utf8');
const managerApplicationsPage = readFileSync(resolve(root, 'src/pages/manager/applications/page.tsx'), 'utf8');
const managerDashboardPage = readFileSync(resolve(root, 'src/pages/manager/dashboard/page.tsx'), 'utf8');
const managerAddPropertyPage = readFileSync(resolve(root, 'src/pages/manager/dashboard/properties/add/page.tsx'), 'utf8');
const registerPage = readFileSync(resolve(root, 'src/pages/auth/register/page.tsx'), 'utf8');
const globalsCss = readFileSync(resolve(root, 'src/globals.css'), 'utf8');

const hasMojibake = (text: string) => {
    for (let index = 0; index < text.length; index += 1) {
        const code = text.codePointAt(index);
        if (code === 0x00c2 || code === 0xfffd) {
            return true;
        }
        if (
            code === 0x00e2
            && text.codePointAt(index + 1) === 0x20ac
            && text.codePointAt(index + 2) === 0x00a2
        ) {
            return true;
        }
    }

    return false;
};

test('manual lead score input no longer seeds a leading zero while typing', () => {
    for (const source of [dashboardLeadModal, sharedLeadModal]) {
        assert.doesNotMatch(source, /score:\s*existingLead\?\.score\s*\|\|\s*0/);
        assert.doesNotMatch(source, /parseInt\(e\.target\.value\)\s*\|\|\s*0/);
        assert.match(source, /normalizeLeadScoreInputValue/);
        assert.match(source, /serializeLeadScoreInputValue/);
    }
});

test('manager lead surfaces avoid mojibake and expose stable regression hooks', () => {
    for (const source of [managerTracker, dashboardLeadModal, sharedLeadModal]) {
        assert.equal(hasMojibake(source), false);
    }

    assert.match(managerTracker, /data-testid="broker-response-widget"/);
    assert.match(managerTracker, /Workspace \$\{workspaceReference\}/);
    assert.doesNotMatch(managerTracker, /Workspace[\s\S]{0,20}â|Â|�/);
});

test('manual lead modal fields are label-associated and validation errors are announced', () => {
    for (const source of [dashboardLeadModal, sharedLeadModal]) {
        for (const field of ['name', 'email', 'phone', 'status', 'property', 'score', 'budget']) {
            assert.match(source, new RegExp(`htmlFor="manual-lead-${field}"`));
            assert.match(source, new RegExp(`id="manual-lead-${field}"`));
        }
        assert.match(source, /role="alert"/);
        assert.match(source, /aria-invalid=\{Boolean\(errors\./);
    }
});

test('manual lead modal keeps submit disabled until required fields are present', () => {
    for (const source of [dashboardLeadModal, sharedLeadModal]) {
        assert.match(source, /const requiredLeadFieldsComplete = Boolean\(/);
        assert.match(source, /const isLeadSubmitDisabled =/);
        assert.match(source, /disabled=\{isLeadSubmitDisabled\}/);
        assert.match(source, /Complete the required lead fields before saving\./);
        assert.match(source, /disabled:cursor-not-allowed disabled:opacity-60/);
    }
});

test('lead score input preserves empty typing state and serializes only on submit', () => {
    assert.equal(normalizeLeadScoreInputValue(''), '');
    assert.equal(normalizeLeadScoreInputValue('0100'), 100);
    assert.equal(serializeLeadScoreInputValue(''), 0);
    assert.equal(serializeLeadScoreInputValue(87), 87);
});

test('discover map view uses the real nearby map with satellite controls', () => {
    const discoverPage = readFileSync(resolve(root, 'src/pages/user/dashboard/discover/page.tsx'), 'utf8');

    assert.match(discoverPage, /NearbyPropertiesMap/);
    assert.doesNotMatch(discoverPage, /StableDiscoveryMap/);
    assert.match(discoverPage, /toDiscoverNearbyMapProperties/);
});

test('discover map properties preserve coordinates for real map markers', () => {
    const [property] = toDiscoverNearbyMapProperties([{
        id: 'property-1',
        title: 'Mapped flat',
        description: '',
        price: 2100,
        property_type: 'flat',
        listing_type: 'rent',
        location: '10 Test Street',
        city: 'London',
        postcode: 'SW1A 1AA',
        bedrooms: 2,
        bathrooms: 1,
        square_feet: 800,
        images: [],
        is_verified: true,
        is_fast_track: true,
        broker_name: '',
        broker_rating: 0,
        response_time_badge: '',
        view_count: 4,
        created_at: '2026-05-10T00:00:00.000Z',
        latitude: 51.501,
        longitude: -0.141,
    }]);

    assert.equal(property.latitude, 51.501);
    assert.equal(property.longitude, -0.141);
    assert.equal(property.address_line_1, '10 Test Street');
});

test('user dashboard property cards expose a direct fast-track start action', () => {
    const propertyCard = readFileSync(resolve(root, 'src/components/dashboard/PropertyCard.tsx'), 'utf8');
    const dashboardClient = readFileSync(resolve(root, 'src/pages/user/dashboard/DashboardClient.tsx'), 'utf8');
    const discoverPage = readFileSync(resolve(root, 'src/pages/user/dashboard/discover/page.tsx'), 'utf8');

    assert.match(propertyCard, /onStartFastTrack\?:/);
    assert.match(propertyCard, /Start 24-Hour Fast Track/);
    assert.match(dashboardClient, /onStartFastTrack=\{openFastTrackFromDashboard\}/);
    assert.match(discoverPage, /onStartFastTrack=\{\(property\) => navigate\(`\/user\/properties\/\$\{property\.id\}\?fast-track=1`\)\}/);
});

test('direct property fast-track start refreshes manager live queue surfaces', () => {
    assert.match(userPropertyDetailPage, /publishWorkspaceSync/);
    assert.match(userPropertyDetailPage, /WORKSPACE_SYNC_TAGS\.FAST_TRACK/);
    assert.match(userPropertyDetailPage, /WORKSPACE_SYNC_TAGS\.MANAGER_DASHBOARD/);
    assert.match(userPropertyDetailPage, /User started fast-track from property detail/);
});

test('rental application submission opens the real applications workspace and keeps applications fetching active', () => {
    assert.match(userPropertyDetailPage, /buildWorkspacePath\('\/user\/applications'/);
    assert.doesNotMatch(userPropertyDetailPage, /navigate\('\/user\/dashboard\/applications'\)/);
    assert.doesNotMatch(managerApplicationsPage, /<ApplicationsProvider>/);
    assert.doesNotMatch(applicationsContext, /hasActiveConsumers/);
    assert.match(applicationsContext, /enabled:\s*Boolean\(user\)/);
});

test('transaction workspaces give search controls and contract actions clear accessible names', () => {
    assert.match(userApplicationFilters, /aria-label="Search applications"/);
    assert.match(managerApplicationFilters, /aria-label="Search applications"/);
    assert.match(userContractsPage, /aria-label="Search homes or contracts"/);
    assert.match(userViewingsPage, /aria-label="Search viewings"/);
    assert.match(managerAppointmentsPage, /aria-label="Search appointments"/);
    assert.match(managerContractsPage, /aria-label="Search contracts"/);
    assert.match(userContractsPage, /aria-label=\{`Open property workspace for \$\{item\.propertyTitle\}`\}/);
});

test('manager appointments keep records visible during background refreshes', () => {
    assert.match(managerAppointmentsPage, /const \[isRefreshing, setIsRefreshing\] = useState\(false\)/);
    assert.match(managerAppointmentsPage, /const shouldBlockForLoad = !options\.background && !hasLoadedAppointmentsRef\.current/);
    assert.match(managerAppointmentsPage, /refresh: \(\) => fetchAppointments\(\{ background: true \}\)/);
    assert.match(managerAppointmentsPage, /onRefresh=\{\(\) => fetchAppointments\(\{ background: true \}\)\}/);
    assert.doesNotMatch(managerAppointmentsPage, /refresh: fetchAppointments/);
});

test('admin dashboard recent notifications expose a search control', () => {
    assert.match(adminDashboardPage, /recentNotificationSearch/);
    assert.match(adminDashboardPage, /htmlFor="recent-notification-search"/);
    assert.match(adminDashboardPage, /id="recent-notification-search"/);
    assert.match(adminDashboardPage, /aria-label="Search recent notifications"/);
    assert.match(adminDashboardPage, /No recent notifications match this search/);
});

test('admin sub-screens expose an explicit back-to-dashboard control', () => {
    assert.match(adminHeader, /Back to admin dashboard/);
    assert.match(adminHeader, /navigate\('\/admin\/dashboard'\)/);
    assert.match(adminHeader, /!isDashboard/);
});

test('admin review moderation confirms destructive actions and refreshes after approval', () => {
    assert.match(adminReviewsPage, /aria-label="Review action confirmation"/);
    assert.match(adminReviewsPage, /requestApprove/);
    assert.match(adminReviewsPage, /requestRemove/);
    assert.match(adminReviewsPage, /await fetchReviews\(pendingAction\.mode, activeTab\)/);
    assert.doesNotMatch(adminReviewsPage, /window\.confirm/);
});

test('admin manager verification modal pauses queue refresh while reviewing', () => {
    assert.match(adminVerificationsPage, /enabled:\s*selectedManagerId === null/);
    assert.match(adminVerificationsPage, /<ManagerReviewModal/);
    assert.match(adminVerificationsPage, /fetchManagers\(\);/);
});

test('admin user verification queue keeps records visible during background refreshes', () => {
    assert.match(userVerificationQueue, /const fetchUsers = useCallback\(async \(options: \{ background\?: boolean \} = \{\}\) =>/);
    assert.match(userVerificationQueue, /const isBackground = options\.background === true/);
    assert.match(userVerificationQueue, /if \(!isBackground\) \{\s*setLoading\(true\);/);
    assert.match(userVerificationQueue, /if \(!isBackground\) \{\s*setLoading\(false\);/);
    assert.match(userVerificationQueue, /refresh: \(\) => fetchUsers\(\{ background: true \}\)/);
    assert.match(userVerificationQueue, /fetchUsers\(\{ background: true \}\);/);
    assert.doesNotMatch(userVerificationQueue, /refresh: fetchUsers/);
});

test('read message conversations do not render a zero unread-count badge', () => {
    assert.match(conversationList, /unreadCount > 0 && \(/);
    assert.match(conversationList, /const unreadLabel = unreadCount > 0 \? `\$\{unreadCount\} unread` : "Read"/);
    assert.doesNotMatch(conversationList, /Read, 0 unread/);
});

test('manager workspace search inputs keep typed text and caret visible in dark mode', () => {
    for (const source of [conversationList, fastTrackWorkspaceLayout]) {
        assert.match(source, /text-gray-950/);
        assert.match(source, /dark:text-white/);
        assert.match(source, /caret-gray-900/);
        assert.match(source, /dark:caret-white/);
        assert.match(source, /placeholder:text-gray-500/);
        assert.match(source, /dark:placeholder:text-gray-500/);
        assert.match(source, /dark:focus:bg-gray-900/);
    }
    assert.match(conversationList, /placeholder="Search messages\.\.\."/);
    assert.match(fastTrackWorkspaceLayout, /placeholder=\{copy\.searchPlaceholder\}/);
});

test('manager add-property full description is visibly length-limited', () => {
    assert.match(managerAddPropertyPage, /PROPERTY_DESCRIPTION_MAX_LENGTH/);
    assert.match(managerAddPropertyPage, /maxLength=\{PROPERTY_DESCRIPTION_MAX_LENGTH\}/);
    assert.match(managerAddPropertyPage, /description-character-count/);
});

test('manager add-property navigation scrolls to top and focuses first validation error', () => {
    assert.match(managerAddPropertyPage, /scrollToFormTop/);
    assert.match(managerAddPropertyPage, /window\.scrollTo\(\{ top: 0, behavior: "smooth" \}\)/);
    assert.match(managerAddPropertyPage, /focusFirstErrorField/);
    assert.match(managerAddPropertyPage, /field\.focus\(\{ preventScroll: true \}\)/);
    assert.match(managerAddPropertyPage, /field\.scrollIntoView\(\{ behavior: "smooth", block: "center" \}\)/);
});

test('manager add-property area fields do not auto-fill browser minimum values', () => {
    assert.match(managerAddPropertyPage, /fieldState\("totalArea"\)[\s\S]{0,80}type="text"[\s\S]{0,80}inputMode="decimal"/);
    assert.match(managerAddPropertyPage, /handleNumericChange\("totalArea", e\.target\.value, 0\)/);
    assert.match(managerAddPropertyPage, /fieldState\("carpetArea"\)[\s\S]{0,80}type="text"[\s\S]{0,80}inputMode="decimal"/);
    assert.match(managerAddPropertyPage, /handleNumericChange\("carpetArea", e\.target\.value, 0\)/);
    assert.doesNotMatch(managerAddPropertyPage, /fieldState\("totalArea"\)[\s\S]{0,220}min="0\.01"/);
    assert.match(globalsCss, /input\[type="number"\]:not\(\.themed-number-input\)::\-webkit-inner-spin-button/);
    assert.doesNotMatch(globalsCss, /\ninput\[type="number"\]::\-webkit-inner-spin-button/);
});

test('register page validates identity fields and persists safe draft data', async () => {
    assert.match(registerPage, /REGISTER_DRAFT_STORAGE_KEY/);
    assert.match(registerPage, /sessionStorage/);

    const registerModule = await import('../pages/auth/register/page');
    const validateRegisterName = registerModule.validateRegisterName as unknown;
    const validateRegisterEmail = registerModule.validateRegisterEmail as unknown;

    assert.equal(typeof validateRegisterName, 'function');
    assert.equal(typeof validateRegisterEmail, 'function');

    assert.equal(
        (validateRegisterName as (value: string) => string | null)('@#$123'),
        'Name can only include letters, spaces, apostrophes, periods, and hyphens',
    );
    assert.equal(
        (validateRegisterEmail as (value: string) => string | null)('test@yopmail.cim'),
        'Please enter a valid email address',
    );
    assert.equal(
        (validateRegisterEmail as (value: string) => string | null)('release-check@yopmail.com'),
        null,
    );
    assert.match(registerPage, /onBlur=\{\(\) => setNameError/);
    assert.match(registerPage, /onBlur=\{\(\) => setEmailError/);
});

test('application progress tracker places documents before review', () => {
    for (const source of [managerApplicationStatusTracker, userApplicationStatusTracker]) {
        const documentsIndex = source.indexOf("label: 'Documents & Compliance'");
        const reviewIndex = source.indexOf("label: 'Application Review'");

        assert.ok(documentsIndex > -1);
        assert.ok(reviewIndex > -1);
        assert.ok(documentsIndex < reviewIndex);
    }
});


test('application progress tracker keeps pending linked viewings current', () => {
    for (const source of [managerApplicationStatusTracker, userApplicationStatusTracker]) {
        assert.match(source, /linkedViewingStatus/);
        assert.match(source, /String\(linkedViewingStatus\)\.trim\(\)\.toLowerCase\(\) !== 'completed'/);
        assert.match(source, /viewingStillPending && nextIndex > viewingIndex \? viewingIndex : nextIndex/);
    }
});
test('manager dashboard property empty state does not show duplicate summary messages', () => {
    assert.match(managerDashboardPage, /const propertySummaryText = propertyTotal > 0/);
    assert.match(managerDashboardPage, /: '';/);
    assert.match(managerDashboardPage, /\{propertySummaryText && <p>\{propertySummaryText\}<\/p>\}/);
    assert.doesNotMatch(managerDashboardPage, /No properties matched the current search/);
    assert.doesNotMatch(managerDashboardPage, /No properties yet\. Add your first property to see it here/);
});
