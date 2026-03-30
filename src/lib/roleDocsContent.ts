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
    title: 'Everything a user needs to move from first search to signed completion on Estospaces.',
    subtitle:
        'This guide explains every major part of the user journey in plain language: how to browse, buy, rent, request broker help, respond during the 10-minute live window, enter the 24-hour fast-track, prepare documents, manage messages, complete contracts, and understand what the Estospaces Team reviews along the way.',
    audience: ['Buyers', 'Renters', 'Applicants', 'Fast-track users'],
    searchPlaceholder: 'Search this guide for buy, rent, fast-track, contracts, documents, or messages',
    supportTitle: 'Need action, not just guidance?',
    supportDescription:
        'Use Help & Support whenever your case needs an actual response from the team, not just process guidance.',
    supportHref: '/user/dashboard/help',
    supportCta: 'Open Help & Support',
    quickActions: [
        {
            eyebrow: 'Start',
            title: 'Open your dashboard',
            description: 'See your active journey, next milestones, saved homes, and live broker updates.',
            href: '/user/dashboard',
        },
        {
            eyebrow: 'Browse',
            title: 'Search homes to buy',
            description: 'Explore listings, refine with filters, and compare options before you commit.',
            href: '/user/dashboard/discover?type=buy',
        },
        {
            eyebrow: 'Browse',
            title: 'Search homes to rent',
            description: 'Move through the rental journey with viewing, application, and contract guidance.',
            href: '/user/dashboard/discover?type=rent',
        },
        {
            eyebrow: 'Support',
            title: 'Open saved properties',
            description: 'Return to shortlisted homes and continue from where you left off.',
            href: '/user/saved',
        },
    ],
    faqs: [
        {
            question: 'When should I use the broker request instead of browsing on my own?',
            answer:
                'Use the broker request when you want human help narrowing options quickly, especially when your timeline is short, your requirements are specific, or you want a ranked shortlist from a matched manager instead of browsing alone.',
        },
        {
            question: 'What changes once I choose a shared property?',
            answer:
                'That property becomes the active property for the journey. Your fast-track, messages, case file, contracts, and payment progress should all stay connected to that chosen home unless the journey is restarted or reassigned.',
        },
        {
            question: 'What does the Estospaces Team review for me?',
            answer:
                'The Estospaces Team may review identity details, profile completeness, supporting documents, and compliance checkpoints that are needed before later steps such as approvals, contracts, or fast-track progression can continue.',
        },
        {
            question: 'What if the 10-minute broker window expires?',
            answer:
                'If no manager accepts in time, the workspace should show that clearly and guide you toward retrying, rematching, or continuing through regular browsing instead of leaving you in an unclear state.',
        },
        {
            question: 'Do I need every document before I start?',
            answer:
                'No. You can start earlier, but the journey moves more smoothly when you gather the likely identity, financial, address, and contract-related documents before viewings, applications, or fast-track milestones depend on them.',
        },
        {
            question: 'Where should I go if something looks wrong in the journey?',
            answer:
                'First read the relevant section here to confirm the expected flow. If the app state still looks wrong, open Help & Support or Messages so the team can review the live case rather than relying on guesswork.',
        },
    ],
    glossary: [
        {
            term: 'Broker request',
            definition:
                'A live request you create when you want a manager or broker to respond to your brief and share relevant properties.',
        },
        {
            term: 'Matched workspace',
            definition:
                'The shared workspace that appears after a manager accepts your live request and begins the property handoff.',
        },
        {
            term: 'Fast-track 24h',
            definition:
                'A guided accelerated journey that starts after a property is selected and keeps the next critical steps moving over the next 24 hours.',
        },
        {
            term: 'Case file',
            definition:
                'The collection of supporting documents and journey context attached to your active property progression.',
        },
        {
            term: 'Estospaces Team review',
            definition:
                'Platform-side checks for verification, compliance, publishing, and progression readiness performed by the Estospaces Team.',
        },
        {
            term: 'Shared shortlist',
            definition:
                'The ranked set of properties a manager sends to you after accepting your broker request.',
        },
    ],
    markdown: userGuideMarkdown,
};

const managerConfig: RoleDocsConfig = {
    role: 'manager',
    label: 'Manager Docs',
    title: 'Everything a manager needs to respond fast, publish compliant properties, and guide clients end to end on Estospaces.',
    subtitle:
        'This guide explains the manager dashboard from the working side of the platform: onboarding, verification, live response handling, matched workspaces, shortlist sharing, property lifecycle, case progression, contracts, billing, and the checkpoints that the Estospaces Team reviews before key steps go live.',
    audience: ['Managers', 'Brokers', 'Property publishers', 'Fast-track operators'],
    searchPlaceholder: 'Search this guide for live response, property review, shortlist, fast-track, contracts, or billing',
    supportTitle: 'Need platform support?',
    supportDescription:
        'Use Help & Support when a case, verification, listing, or compliance issue needs intervention from the team.',
    supportHref: '/manager/help',
    supportCta: 'Open Manager Support',
    quickActions: [
        {
            eyebrow: 'Command center',
            title: 'Open dashboard',
            description: 'Check live response status, active workspaces, and operational priorities.',
            href: '/manager/dashboard',
        },
        {
            eyebrow: 'Inventory',
            title: 'Manage properties',
            description: 'Create, review, edit, and monitor the lifecycle of every listing in your portfolio.',
            href: '/manager/dashboard/properties',
        },
        {
            eyebrow: 'Live work',
            title: 'Open leads & clients',
            description: 'Accept requests, manage matched clients, and follow the active pipeline.',
            href: '/manager/leads',
        },
        {
            eyebrow: 'Acceleration',
            title: 'Open Fast Track 24h',
            description: 'Track the accelerated cases that need close coordination and timely follow-through.',
            href: '/manager/fast-track',
        },
    ],
    faqs: [
        {
            question: "Why can't I share a property that I just created?",
            answer:
                'A newly created listing may still be in draft or pending review. Only properties that have reached a shareable live status should appear for shortlist sharing, so always confirm that publishing and review have completed first.',
        },
        {
            question: 'What should I do during the 10-minute response window?',
            answer:
                'Stay available, review the request brief quickly, and accept only when you can actually carry the next steps forward. Speed matters, but so does commitment because the matched workspace depends on timely follow-through after acceptance.',
        },
        {
            question: 'What does the Estospaces Team review before a property goes live?',
            answer:
                'The Estospaces Team may review listing completeness, policy compliance, verification status, media quality, and any other publication requirements needed before the listing can move from pending approval to a live shareable state.',
        },
        {
            question: 'How should I decide which properties to shortlist?',
            answer:
                "Prioritize relevance over volume. Share only properties that genuinely fit the client's brief, timeline, budget, and journey stage, and rank them in the order you would confidently discuss with the client first.",
        },
        {
            question: 'What if a lead or request is no longer active?',
            answer:
                'Treat inactive requests as historical context rather than live work. Move to the active matched workspace, fast-track case, or support escalation instead of trying to trigger actions that belong to an earlier stage.',
        },
        {
            question: 'When should I escalate to support?',
            answer:
                'Escalate when you are blocked by verification, document integrity, platform state, approval delays, payment questions, or contract issues that cannot be resolved by normal manager-side actions.',
        },
    ],
    glossary: [
        {
            term: 'Live response',
            definition:
                'The short window where incoming user broker requests appear and a manager can accept them in real time.',
        },
        {
            term: 'Matched client workspace',
            definition:
                'The post-acceptance workspace where a manager reviews the user brief and shares a shortlist of properties.',
        },
        {
            term: 'Pending approval',
            definition:
                'A property status indicating the listing has been submitted and is awaiting Estospaces Team review before it can go live.',
        },
        {
            term: 'Published / active / online',
            definition:
                'Live property states that indicate the listing is available to surface, share, or operate within the platform flow.',
        },
        {
            term: 'Fast-track case',
            definition:
                'The active accelerated case attached to a chosen property once the user moves into the 24-hour guided journey.',
        },
        {
            term: 'Compliance checkpoint',
            definition:
                'A review point where the Estospaces Team validates readiness, policy alignment, or verification before the next business step continues.',
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
