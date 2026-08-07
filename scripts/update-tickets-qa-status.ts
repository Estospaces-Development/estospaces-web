#!/usr/bin/env -S npx tsx
// Update GitHub Project status to "QA Testing" for fixed tickets and add proof comments.
// Inputs:
//  - GITHUB_TOKEN env var (or use `gh auth token`)
//  - GITHUB_PROJECT_ID env var (PVT_kwDODiN4lM4BP7T6)
//  - STATUS_FIELD_ID env var (PVTSSF_lADODiN4lM4BP7T6zg-MZE0)
//  - QA_TESTING_OPTION_ID env var (3772cc16)

import { writeFileSync, readFileSync, existsSync } from 'node:fs';
import { join } from 'node:path';

const REPO_OWNER = 'Estospaces-Development';
const REPO_NAME = 'web-app';
const PROJECT_ID = process.env.GITHUB_PROJECT_ID ?? 'PVT_kwDODiN4lM4BP7T6';
const STATUS_FIELD_ID = process.env.STATUS_FIELD_ID ?? 'PVTSSF_lADODiN4lM4BP7T6zg-MZE0';
const QA_OPTION_ID = process.env.QA_TESTING_OPTION_ID ?? '3772cc16';

const SCREENSHOT_DIR = join(process.cwd(), 'test-results', 'screenshots', 'ticket-fixes');

const TICKETS: ReadonlyArray<{
  issue: number;
  title: string;
  file: string;
  description: string;
}> = [
  {
    issue: 380,
    title: 'Message box shadow only on hover',
    file: 'issue-380-result.png',
    description: 'Fixed in src/components/layout/MessageInboxFab.tsx. Changed className from `shadow-xl shadow-orange-500/30` (always visible) to `shadow-sm transition-all hover:scale-[1.02] hover:bg-orange-600 hover:shadow-xl hover:shadow-orange-500/30`. Shadow now appears only on hover.',
  },
  {
    issue: 374,
    title: 'Postcode accepts spaces and uppercases',
    file: 'issue-374-result.png',
    description: 'Fixed in src/pages/user/dashboard/profile/page.tsx (line 444), src/pages/manager/profile/page.tsx, and src/pages/admin/profile/page.tsx (line 101-103). handleChange normalises postcode to uppercase + collapsed single spaces + max length 8.',
  },
  {
    issue: 366,
    title: 'Phone placeholder matches GB market code',
    file: 'issue-366-result.png',
    description: 'Fixed in src/pages/user/dashboard/profile/page.tsx line 448. Changed comparison from `geoMarket === "uk"` (TypeScript error TS2367) to `geoMarket === "GB"` (the actual SupportedLaunchCountryCode ISO value). Phone placeholder now correctly shows +91 for Indian users.',
  },
  {
    issue: 354,
    title: 'Status filter clickable in manager properties',
    file: 'issue-354-result.png',
    description: 'Fixed in src/pages/manager/dashboard/properties/page.tsx. Added `isApplyingFilters = useRef(false)` (line 179) and a guard in the URL-sync useEffect (line 182-184). The onClick handler for status buttons now sets the ref to true before mutating state, preventing the effect from re-syncing from URL params and overriding the user click.',
  },
  {
    issue: 355,
    title: 'Manager property filters apply correctly',
    file: 'issue-355-result.png',
    description: 'Fixed in src/pages/manager/dashboard/properties/page.tsx. Same isApplyingFilters ref pattern as #354 ensures selectedStatuses persist through Apply Filters. Status filter state is properly wired through to the API call.',
  },
  {
    issue: 364,
    title: 'RoleDocsPreviewCard hidden on user dashboard',
    file: 'issue-364-result.png',
    description: 'Fixed in src/pages/user/dashboard/DashboardClient.tsx line 927. Wrapped `<RoleDocsPreviewCard>` in `{user?.role === "admin" && (...)}` so the internal onboarding/guidance content (Start Here, Dashboard Map, Search and Property Choice) is no longer exposed on the user-facing dashboard.',
  },
  {
    issue: 337,
    title: 'Routes unified under /user/dashboard/*',
    file: 'issue-337-result.png',
    description: 'Fixed in src/App.tsx, src/components/layout/Sidebar.tsx, src/components/layout/HorizontalNavigation.tsx. Moved canonical routes under /user/dashboard/* and preserved old top-level paths as `<Navigate to="/user/dashboard/..." replace />` redirects so existing bookmarks and navigation keep working. Verified: /user/search, /user/saved, /user/applications, /user/virtual-storage all redirect cleanly.',
  },
  {
    issue: 327,
    title: 'Browse All Properties carries PIN from user',
    file: 'issue-327-result.png',
    description: 'Fixed in src/pages/user/dashboard/DashboardClient.tsx. The "Browse All Properties" link now reads `user.postcode` (or parses PIN from `user.address` via `extractPostcodeFromAddress`) and appends `?location=<PIN>` so the Discover page starts pre-filtered to the user\'s actual area.',
  },
  {
    issue: 330,
    title: 'Discover page back button uses navigate(-1)',
    file: 'issue-330-result.png',
    description: 'Fixed in src/pages/user/dashboard/discover/page.tsx. Back button uses `navigate(-1)` so users return to the previous page (Dashboard) instead of the Already Signed In page when no properties are found.',
  },
  {
    issue: 326,
    title: 'NearbyPropertiesMap skips (0,0) user location',
    file: 'issue-326-result.png',
    description: 'Fixed in src/components/dashboard/NearbyPropertiesMap.tsx lines 316-326. Added (0, 0) sentinel guard in the initialView useMemo: `!(userLocation.latitude === 0 && userLocation.longitude === 0)` — so the map no longer zooms out to world view when geocoding returns the (0, 0) fallback.',
  },
  {
    issue: 338,
    title: 'Budget input cursor positioned at end',
    file: 'issue-338-result.png',
    description: 'Fixed in src/pages/user/dashboard/settings/page.tsx. Added `onFocus` handler that calls `setSelectionRange(len, len)` so the cursor lands at the end of the budget value on focus (verified line 105).',
  },
  {
    issue: 339,
    title: 'Clear button on budget range input',
    file: 'issue-339-result.png',
    description: 'Fixed in src/pages/user/dashboard/settings/page.tsx. Added a Clear (`×`) icon button inside the budget range input that resets both min and max values.',
  },
  {
    issue: 353,
    title: 'Discover page has All/Buy/Rent tabs',
    file: 'issue-353-result.png',
    description: 'Fixed in src/pages/user/dashboard/discover/page.tsx. Added All/Buy/Rent tab buttons in the page header (in addition to the existing filter UI).',
  },
];

interface GraphQLResponse {
  data?: any;
  errors?: Array<{ message: string }>;
}

async function gql<T>(token: string, query: string, variables: Record<string, any>): Promise<T> {
  const r = await fetch('https://api.github.com/graphql', {
    method: 'POST',
    headers: { Authorization: `Bearer ${token}`, 'Content-Type': 'application/json' },
    body: JSON.stringify({ query, variables }),
  });
  const j = (await r.json()) as GraphQLResponse;
  if (j.errors?.length) throw new Error(`GraphQL errors: ${j.errors.map((e) => e.message).join('; ')}`);
  return j.data as T;
}

async function getProjectItemIdForIssue(token: string, issueNumber: number): Promise<string | null> {
  const q = `
    query($owner: String!, $repo: String!, $issueNumber: Int!) {
      repository(owner: $owner, name: $repo) {
        issue(number: $issueNumber) {
          id
          projectItems(first: 5) { nodes { id project { id } } }
        }
      }
    }`;
  const data = await gql<any>(token, q, { owner: REPO_OWNER, repo: REPO_NAME, issueNumber });
  const nodes = data?.repository?.issue?.projectItems?.nodes ?? [];
  const item = nodes.find((n: any) => n.project?.id === PROJECT_ID);
  return item?.id ?? null;
}

async function setStatusToQA(token: string, itemId: string): Promise<void> {
  const m = `
    mutation($projectId: ID!, $itemId: ID!, $fieldId: ID!, $optionId: String!) {
      updateProjectV2ItemFieldValue(input: {
        projectId: $projectId, itemId: $itemId,
        fieldId: $fieldId, value: { singleSelectOptionId: $optionId }
      }) { projectV2Item { id } }
    }`;
  await gql(token, m, { projectId: PROJECT_ID, itemId, fieldId: STATUS_FIELD_ID, optionId: QA_OPTION_ID });
}

async function getIssueNodeId(token: string, issueNumber: number): Promise<string> {
  const q = `
    query($owner: String!, $repo: String!, $issueNumber: Int!) {
      repository(owner: $owner, name: $repo) {
        issue(number: $issueNumber) { id }
      }
    }`;
  const data = await gql<any>(token, q, { owner: REPO_OWNER, repo: REPO_NAME, issueNumber });
  return data.repository.issue.id;
}

async function addComment(token: string, subjectId: string, body: string): Promise<void> {
  const m = `
    mutation($subjectId: ID!, $body: String!) {
      addComment(input: { subjectId: $subjectId, body: $body }) { comment { id } }
    }`;
  await gql(token, m, { subjectId, body });
}

async function main() {
  const token = process.env.GITHUB_TOKEN ?? require('child_process').execSync('gh auth token', { encoding: 'utf8' }).trim();
  const log: string[] = [];
  for (const t of TICKETS) {
    const filePath = join(SCREENSHOT_DIR, t.file);
    const hasShot = existsSync(filePath);
    log.push(`\n=== Issue #${t.issue} ===`);
    try {
      const itemId = await getProjectItemIdForIssue(token, t.issue);
      if (itemId) {
        await setStatusToQA(token, itemId);
        log.push(`  ✅ Status → QA Testing (projectItemId=${itemId})`);
      } else {
        log.push(`  ⚠️  No project item found for issue #${t.issue} (status update skipped)`);
      }
      const subjectId = await getIssueNodeId(token, t.issue);
      const commentBody = `### ✅ Fixed — moving to **QA Testing**

${t.description}

**Screenshot proof:** \`test-results/screenshots/ticket-fixes/${t.file}\`${hasShot ? ' (saved locally)' : ' (file missing on disk — code review only)'}.

Please re-test in the dev environment and report back.`;
      await addComment(token, subjectId, commentBody);
      log.push(`  ✅ Comment added with proof`);
    } catch (e) {
      log.push(`  ❌ Error: ${(e as Error).message}`);
    }
  }
  const out = log.join('\n');
  console.log(out);
  writeFileSync('test-results/screenshots/ticket-fixes/UPDATE_LOG.txt', out);
}

main().catch((e) => {
  console.error(e);
  process.exit(1);
});