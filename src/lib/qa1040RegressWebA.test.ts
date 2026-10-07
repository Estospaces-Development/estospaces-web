import assert from 'node:assert/strict';
import { readFileSync } from 'node:fs';
import test from 'node:test';

import type { AnalyticsData } from '@/services/analyticsService';
import { mapBackendApplication } from '../contexts/ApplicationsContext';
import { buildAdminDashboardSnapshot } from './adminPlatformAnalytics';
import { getManagerCreateContractGuard } from './managerWorkflowGuards';

const read = (path: string) => readFileSync(new URL(`../${path}`, import.meta.url), 'utf8');

test('the admin user registry keeps page, role tab and search in the URL (MB-0623)', () => {
    const page = read('pages/admin/users/page.tsx');
    assert.match(page, /const \[searchParams, setSearchParams\] = useSearchParams\(\);/);
    assert.match(page, /useState\(\(\) => normalizeAdminUserSearchInput\(searchParams\.get\('search'\) \|\| ''\)\)/);
    assert.match(page, /const activeTab = ADMIN_USER_ROLE_TABS\.find\(\(tab\) => tab === searchParams\.get\('role'\)\) \?\? 'all';/);
    assert.match(page, /const currentPage = Math\.max\(1, Number\.parseInt\(searchParams\.get\('page'\)/);
    assert.match(page, /updateUserListParams\(\{ search: nextSearch \|\| null, page: null \}\);/);
    assert.match(page, /if \(requestId !== usersRequestId\.current\) return;/);
    assert.doesNotMatch(page, /const \[currentPage, setCurrentPage\] = useState\(1\);/);
});

test('admin settings do not offer 2FA or session timeout as live controls (MB-0635)', () => {
    const page = read('pages/admin/settings/page.tsx');
    assert.doesNotMatch(page, /twoFactorAuth: !settings\.twoFactorAuth/);
    assert.doesNotMatch(page, /sessionTimeout: e\.target\.value/);
    assert.match(page, /A second factor is not enforced yet\./);
    assert.match(page, /Sessions are not ended automatically after inactivity yet\./);
});

test('the admin dashboard labels the lead total as leads, not bookings or Fast Track flows (MB-0644)', () => {
    const snapshot = buildAdminDashboardSnapshot({ total_leads: 141, active_leads: 121 } as AnalyticsData);
    assert.equal(snapshot.find((item) => item.label === 'Total Leads')?.value, '141');
    assert.equal(snapshot.some((item) => item.label === 'Total Bookings'), false);

    const page = read('pages/admin/dashboard/page.tsx');
    assert.match(page, /openLeads: data\?\.active_leads \?\? 0/);
    assert.doesNotMatch(page, /leadAnalytics\?\.totalLeads/);
    assert.doesNotMatch(page, /Active fast-track flows|active lead transactions/);
});

test('manager Lead Trend bars have height, visible values and a sign-aware growth pill (MB-0650)', () => {
    const page = read('pages/manager/analytics/page.tsx');
    assert.match(page, /className="group flex h-full min-w-0 flex-1 flex-col items-center"/);
    assert.match(page, /\{item\.value\}<span className="sr-only"> \{item\.value === 1 \? 'lead' : 'leads'\}<\/span>/);
    assert.doesNotMatch(page, /opacity-0 group-hover:opacity-100/);
    assert.match(page, /const GrowthIcon = growthValue < 0 \? ArrowDownRight : growthValue > 0 \? ArrowUpRight : ArrowRight;/);
    assert.doesNotMatch(page, /flex items-center gap-1 text-green-700 text-xs font-bold bg-green-100/);
});

test('referencing and ready_for_contract applications keep their own status and filter option (MB-0495)', () => {
    const base = {
        id: 'application-1',
        property_id: 'property-1',
        user_id: 'user-1',
        listing_type: 'rent',
        created_at: '2026-10-01T08:00:00Z',
        updated_at: '2026-10-01T08:00:00Z',
    };
    const viewing = { status: 'confirmed' };
    assert.equal(mapBackendApplication({ ...base, status: 'ready_for_contract' } as any, viewing as any).status, 'ready_for_contract');
    assert.equal(mapBackendApplication({ ...base, status: 'referencing' } as any).status, 'referencing');

    for (const filters of ['components/manager/applications/ApplicationFilters.tsx', 'components/dashboard/applications/ApplicationFilters.tsx']) {
        const source = read(filters);
        assert.match(source, /value: APPLICATION_STATUS\.REFERENCING, label: 'Referencing'/, filters);
        assert.match(source, /value: APPLICATION_STATUS\.READY_FOR_CONTRACT, label: 'Ready for Contract'/, filters);
    }
});

test('a rent application without a Fast Track case reads readiness and its contract directly (MB-0499)', () => {
    const detail = read('components/manager/applications/ApplicationDetail.tsx');
    assert.match(detail, /!hasCase && targetApplication\.propertyId\s*\? getPropertyComplianceReadiness\(targetApplication\.propertyId\)/);
    assert.match(detail, /: getUserContracts\(managerWorkflowRequestOptions\);/);
    assert.match(detail, /rentCaseFile\?\.property_compliance_readiness \|\| rentWithoutCase\.readiness \|\| null;/);
    assert.match(detail, /hasContract: Boolean\(rentContractId\),/);
    assert.match(detail, /applicationApproved: rentApplicationApproved,/);
    // A failed read must not take down referencing and approval; it only blocks the contract action.
    assert.doesNotMatch(detail, /throw new Error\((readinessResult|contractsResult)\.error\)/);
    assert.match(detail, /unavailable: Boolean\(readinessResult\.error \|\| contractsResult\.error\),/);

    const guardInput = { hasContract: false, applicationApproved: true, hasPropertyLink: true, rentContractReady: true };
    assert.equal(getManagerCreateContractGuard(guardInput).canRun, true);
    const unavailable = getManagerCreateContractGuard({
        ...guardInput,
        workflowError: 'Property readiness is temporarily unavailable for this application. Refresh to retry before creating the contract.',
    });
    assert.equal(unavailable.status, 'unavailable');
    assert.equal(unavailable.target, 'property_readiness');
});

test('the manager leads list keeps status, sort and page in the URL (MB-0336)', () => {
    const page = read('pages/manager/leads/page.tsx');
    assert.match(page, /const statusFilter = STATUS_FILTERS\.find\(\(filter\) => filter\.value === searchParams\.get\('status'\)\)\?\.value \?\? 'all';/);
    assert.match(page, /const sortMode = SORT_OPTIONS\.find\(\(option\) => option\.value === searchParams\.get\('sort'\)\)\?\.value \?\? 'newest';/);
    assert.match(page, /const currentPage = Math\.max\(1, Number\.parseInt\(searchParams\.get\('page'\)/);
    assert.match(page, /\}, \{ replace: true \}\);/);
    assert.doesNotMatch(page, /useState\('all'\)|useState<ManagerLeadSortMode>|setCurrentPage\(1\);\s*\}, \[searchQuery, sortMode, statusFilter\]\);/);
});

test('the manager message thread column can shrink so long tokens wrap (MB-0565)', () => {
    assert.match(read('pages/manager/messages/page.tsx'), /\$\{showThread \? 'flex' : 'hidden'\} min-w-0 flex-1 flex-col h-full/);
});
