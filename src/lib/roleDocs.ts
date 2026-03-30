export interface RoleDocsSection {
    title: string;
    slug: string;
    body: string;
}

export interface RoleDocsDocument {
    intro: string;
    sections: RoleDocsSection[];
}

export interface RoleDocsQuickAction {
    title: string;
    description: string;
    href: string;
    eyebrow: string;
}

export interface RoleDocsFaq {
    question: string;
    answer: string;
}

export interface RoleDocsGlossaryItem {
    term: string;
    definition: string;
}

export interface RoleDocsConfig {
    role: 'user' | 'manager';
    label: string;
    title: string;
    subtitle: string;
    audience: string[];
    searchPlaceholder: string;
    supportTitle: string;
    supportDescription: string;
    supportHref: string;
    supportCta: string;
    quickActions: RoleDocsQuickAction[];
    faqs: RoleDocsFaq[];
    glossary: RoleDocsGlossaryItem[];
    markdown: string;
}

export const slugifyHeading = (value: string) =>
    value
        .toLowerCase()
        .trim()
        .replace(/[`*_~]/g, '')
        .replace(/[^a-z0-9\s-]/g, '')
        .replace(/\s+/g, '-')
        .replace(/-+/g, '-');

const createUniqueSlug = (title: string, seen: Map<string, number>) => {
    const baseSlug = slugifyHeading(title) || 'section';
    const currentCount = seen.get(baseSlug) ?? 0;
    seen.set(baseSlug, currentCount + 1);

    if (currentCount === 0) {
        return baseSlug;
    }

    return `${baseSlug}-${currentCount + 1}`;
};

export function parseRoleDocs(markdown: string): RoleDocsDocument {
    const lines = markdown.replace(/\r\n/g, '\n').split('\n');
    const introLines: string[] = [];
    const sections: RoleDocsSection[] = [];
    const seenSlugs = new Map<string, number>();

    let currentTitle = '';
    let currentSlug = '';
    let currentLines: string[] = [];

    const pushSection = () => {
        if (!currentTitle) {
            return;
        }

        sections.push({
            title: currentTitle,
            slug: currentSlug,
            body: currentLines.join('\n').trim(),
        });
    };

    for (const line of lines) {
        const headingMatch = line.match(/^##\s+(.+?)\s*$/);

        if (headingMatch) {
            pushSection();
            currentTitle = headingMatch[1].trim();
            currentSlug = createUniqueSlug(currentTitle, seenSlugs);
            currentLines = [];
            continue;
        }

        if (!currentTitle) {
            introLines.push(line);
            continue;
        }

        currentLines.push(line);
    }

    pushSection();

    return {
        intro: introLines.join('\n').trim(),
        sections,
    };
}
