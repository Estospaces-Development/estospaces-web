import managerGuideMarkdown from '../../docs/manager/MANAGER-DASHBOARD-GUIDE.md?raw';
import userGuideMarkdown from '../../docs/user/USER-DASHBOARD-GUIDE.md?raw';
import { parseRoleDocs, type RoleDocsConfig } from './roleDocs';

interface ResolvedRoleDocsConfig {
    config: RoleDocsConfig;
    document: ReturnType<typeof parseRoleDocs>;
}

const userConfig: RoleDocsConfig = {
    role: 'user',
    label: 'User Docs',
    title: 'Guide to the current user dashboard, redesigned fast-track workspace, and linked case journey on Estospaces.',
    subtitle:
        'Use this guide to understand the user dashboard as it exists today: hero search, buy and rent shortcuts, saved properties, the 10-minute broker request workspace, the redesigned 24-hour fast-track workspace, linked applications and contracts, and the routes that now own the next action.',
    audience: ['Buyers', 'Renters', 'Applicants', 'Fast-track users'],
    searchPlaceholder: 'Search this guide for broker request, dashboard search, fast-track, saved properties, documents, messages, or support',
    supportTitle: 'Need action, not just guidance?',
    supportDescription:
        'Use Help & Support whenever your case needs an actual response from the team, not just process guidance.',
    supportHref: '/user/dashboard/help',
    supportCta: 'Open Help & Support',
    quickActions: [
        {
            eyebrow: 'Start',
            title: 'Open your dashboard',
            description: 'See your active journey, dashboard search, broker workspace, and the current tracking modules first.',
            href: '/user/dashboard',
        },
        {
            eyebrow: 'Live help',
            title: 'Open broker request',
            description: 'Jump to the live dispatch workspace and ask a broker to respond to your brief.',
            href: '/user/dashboard?workspace=broker-request',
        },
        {
            eyebrow: 'Browse',
            title: 'Search homes to buy',
            description: 'Open the buy discovery flow from the dashboard and compare serious options.',
            href: '/user/dashboard/discover?type=buy',
        },
        {
            eyebrow: 'Browse',
            title: 'Search homes to rent',
            description: 'Open the rent discovery flow and move toward viewings, applications, and contracts.',
            href: '/user/dashboard/discover?type=rent',
        },
        {
            eyebrow: 'Fast-track',
            title: 'Open Fast-track 24h',
            description: 'Jump into the active case workspace where the selected property journey now stays visible end to end.',
            href: '/user/dashboard/fast-track',
        },
    ],
    faqs: [
        {
            question: 'What is the fastest way to understand the dashboard when I sign in?',
            answer:
                'Start at the main dashboard view first. Check whether a live broker request, fast-track case, application, or contract is already active before you move back into browsing.',
        },
        {
            question: 'When should I use the broker request instead of browsing on my own?',
            answer:
                'Use the broker request when you want human help quickly, especially when your timeline is short or your requirements are specific. The live workspace is designed for a 10-minute broker-matching stage rather than passive browsing.',
        },
        {
            question: 'Why did the dashboard switch into a results grid instead of showing the usual widgets?',
            answer:
                'That happens when the dashboard search or one of the quick filters is active. Use Clear Results to return to the normal dashboard view with the broker workspace, tracking module, and nearby map.',
        },
        {
            question: 'What changes once I choose a broker-shared property?',
            answer:
                'The selected property becomes the center of the next journey. Fast-track becomes the main workflow workspace, companion pages stay linked to the same case, and the case file becomes support context instead of the route that owns progression.',
        },
        {
            question: 'Where should I track the current stage of my live journey?',
            answer:
                'Use the Real-Time Tracking module on the dashboard first, then open Fast-track 24h for the live case workspace. That is where the mandatory stepper, current focus, files, chat, preview, and linked actions now stay visible.',
        },
        {
            question: 'Can I still use applications, viewings, or contracts directly?',
            answer:
                'Yes, but only as companion pages. They reflect the linked fast-track case and can still handle role-relevant manual actions, while fast-track remains the workflow source of truth.',
        },
        {
            question: 'What if no broker accepts in the 10-minute window?',
            answer:
                'The request expired without a live match. Retry, change the brief, or continue browsing instead of waiting in uncertainty.',
        },
        {
            question: 'Where should I go if a contract, document, or case step looks wrong?',
            answer:
                'Open Messages or Help & Support when the live case needs a real review. Do not keep progressing if the wrong property, contract context, or document state is shown.',
        },
    ],
    glossary: [
        {
            term: 'Dashboard search',
            definition:
                'The hero search on the main dashboard that can temporarily switch the page into a filtered-results view.',
        },
        {
            term: 'Broker request workspace',
            definition:
                'The live dashboard panel where you create a request, wait through the 10-minute dispatch, and later review the matched broker shortlist.',
        },
        {
            term: 'Real-Time Tracking',
            definition:
                'The dashboard module that shows progress for active broker requests, applications, and related live journeys.',
        },
        {
            term: 'Selected property',
            definition:
                'The property that now owns the active fast-track, documents, applications, viewings, and contract journey.',
        },
        {
            term: 'Fast-track 24h',
            definition:
                'The accelerated active journey that starts after a property is selected and now acts as the main workflow workspace from documents to handover.',
        },
        {
            term: 'Help & Support',
            definition:
                'The support route you use when the app state, document flow, case linkage, or contract context needs human intervention.',
        },
        {
            term: 'Companion pages',
            definition:
                'Applications, viewings, and contracts pages that stay linked to the same fast-track case and expose relevant manual actions without becoming a second workflow owner.',
        },
    ],
    markdown: userGuideMarkdown,
};

const managerConfig: RoleDocsConfig = {
    role: 'manager',
    label: 'Manager Docs',
    title: 'Guide to the current manager dashboard, live response tracker, and redesigned fast-track workflow on Estospaces.',
    subtitle:
        'Use this guide to understand the manager dashboard as it exists today: the KPI overview, tab routes, live response tracker, matched workspace shortlist sharing, the redesigned Fast Track 24h workspace, linked applications, appointments, contracts, readiness checks, and the routes that own ongoing client execution.',
    audience: ['Managers', 'Brokers', 'Property publishers', 'Fast-track operators'],
    searchPlaceholder: 'Search this guide for live response, shortlist sharing, fast-track, properties, verification, documents, or support',
    supportTitle: 'Need platform support?',
    supportDescription:
        'Use Help & Support when a case, verification, listing, or compliance issue needs intervention from the team.',
    supportHref: '/manager/help',
    supportCta: 'Open Manager Support',
    quickActions: [
        {
            eyebrow: 'Command center',
            title: 'Open dashboard',
            description: 'Check live response status, active workspaces, fast-track pressure, and inventory health.',
            href: '/manager/dashboard',
        },
        {
            eyebrow: 'Live work',
            title: 'Open leads & clients',
            description: 'Move from pending requests into matched workspaces and client follow-through.',
            href: '/manager/leads',
        },
        {
            eyebrow: 'Inventory',
            title: 'Manage properties',
            description: 'Create, review, edit, and monitor the lifecycle of every listing in your portfolio.',
            href: '/manager/dashboard/properties',
        },
        {
            eyebrow: 'Acceleration',
            title: 'Open Fast Track 24h',
            description: 'Track the accelerated cases that need close coordination, current focus, and immediate next actions in one workspace.',
            href: '/manager/fast-track',
        },
        {
            eyebrow: 'Readiness',
            title: 'Open user verifications',
            description: 'Check whether document or identity readiness is the blocker on an active case.',
            href: '/manager/user-verifications',
        },
    ],
    faqs: [
        {
            question: 'What should I review first when I open the manager dashboard?',
            answer:
                'Check readiness first, then live response, then fast-track pressure, then inventory. The dashboard is most useful when you confirm whether you are operational before you start answering requests.',
        },
        {
            question: 'How should I use the Live Response Tracker?',
            answer:
                'Use it as the intake desk for live work. Stay available only when you can follow through, review the brief before responding, and move into shortlist sharing quickly once a workspace is matched.',
        },
        {
            question: "Why can't I share a property that I just created?",
            answer:
                'A newly created listing may still be draft or pending approval. Only properties with a live shareable status should be used for shortlist sharing, so always confirm the real listing status first.',
        },
        {
            question: 'What is the Fast Track 24h lane on the dashboard for?',
            answer:
                'It is the manager-side queue for selected-property cases that now need close follow-through. Use it to spot active, closing-soon, and completed cases, then open the redesigned workspace where the stepper, current focus, utility dock, and linked actions stay together.',
        },
        {
            question: 'How should I handle a pending reservation approval?',
            answer:
                'Open the reservation on the dashboard, verify the property, booking dates, user, and linked journey, then select Confirm Reservation only when those details are correct. After confirmation, verify both the success message and the updated status.',
        },
        {
            question: 'When should I use leads, messages, and appointments separately?',
            answer:
                'Use leads for intake and active client context, messages for written coordination, and appointments for schedule ownership. Once a case is in fast-track, applications, appointments, and contracts should behave as linked companion pages instead of separate workflow owners.',
        },
        {
            question: 'What usually blocks a manager from operating smoothly?',
            answer:
                'The common blockers are incomplete verification, non-shareable inventory, missing user documents, and case states that no longer match the route you are trying to use.',
        },
        {
            question: 'What if a request or case is no longer active?',
            answer:
                'Treat inactive requests as historical context rather than live work. Move to the matched workspace, fast-track case, or support path that reflects the real current state.',
        },
        {
            question: 'When should I escalate to support?',
            answer:
                'Escalate when you are blocked by verification, document integrity, platform state, approval delays, case linkage, or contract issues that cannot be resolved by normal manager-side actions.',
        },
    ],
    glossary: [
        {
            term: 'Live Response Tracker',
            definition:
                'The dashboard intake desk where managers handle live broker requests, matched workspaces, and shortlist sharing.',
        },
        {
            term: 'Matched workspace',
            definition:
                'The client-specific workspace that appears after a request is matched and where shortlist sharing begins.',
        },
        {
            term: 'Pending approval',
            definition:
                'A property status indicating the listing has been submitted and is awaiting Estospaces Team review before it can go live.',
        },
        {
            term: 'Fast Track 24h lane',
            definition:
                'The dashboard queue that summarizes active, closing-soon, and completed fast-track cases and opens the main workflow workspace.',
        },
        {
            term: 'Reservation approval',
            definition:
                'A pending booking request that the manager validates against the property, dates, user, and linked journey before confirming it.',
        },
        {
            term: 'Shareable inventory',
            definition:
                'Properties that are live and suitable to be shortlisted into a matched client workspace.',
        },
        {
            term: 'User verifications',
            definition:
                'The manager route used to confirm whether user identity or document readiness is blocking progression.',
        },
        {
            term: 'Response SLA',
            definition:
                'The live timing expectation that makes pending broker requests time-sensitive and operationally urgent.',
        },
        {
            term: 'Manager support',
            definition:
                'The help route used when a case, listing, verification, document, or contract issue needs platform intervention.',
        },
        {
            term: 'Utility dock',
            definition:
                'The secondary tool area inside fast-track where files, preview, case chat, activity, and connected records stay available without replacing the main stage workspace.',
        },
    ],
    markdown: managerGuideMarkdown,
};

export const userDocs = {
    config: userConfig,
    document: parseRoleDocs(userConfig.markdown),
} satisfies ResolvedRoleDocsConfig;

export const managerDocs = {
    config: managerConfig,
    document: parseRoleDocs(managerConfig.markdown),
} satisfies ResolvedRoleDocsConfig;
