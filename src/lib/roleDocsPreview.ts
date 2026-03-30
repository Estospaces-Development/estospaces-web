const DEFAULT_PREVIEW =
    'Open this section for the full workflow, required inputs, timing guidance, and escalation notes.';

const PREFERRED_HEADINGS = [
    /^what it is$/i,
    /^what this section is about$/i,
    /^what this section answers$/i,
    /^what this section covers$/i,
    /^why it matters$/i,
];

const shouldIgnoreLine = (value: string) =>
    !value ||
    value.startsWith('```') ||
    value.startsWith('|') ||
    value.startsWith('>') ||
    value.startsWith('- ') ||
    value.startsWith('* ') ||
    /^\d+\.\s/.test(value);

const cleanMarkdownInline = (value: string) =>
    value
        .replace(/`([^`]+)`/g, '$1')
        .replace(/\[([^\]]+)\]\(([^)]+)\)/g, '$1')
        .replace(/[*_~]/g, '')
        .replace(/\s+/g, ' ')
        .trim();

const truncatePreview = (value: string, maxLength = 170) => {
    if (value.length <= maxLength) {
        return value;
    }

    const firstSentenceMatch = value.match(/^(.+?[.!?])(?:\s|$)/);
    if (firstSentenceMatch && firstSentenceMatch[1].length <= 220) {
        return firstSentenceMatch[1].trim();
    }

    const trimmed = value.slice(0, maxLength - 3);
    const lastWordBoundary = trimmed.lastIndexOf(' ');
    const safeCutoff = lastWordBoundary >= 90 ? lastWordBoundary : trimmed.length;
    return `${trimmed.slice(0, safeCutoff).trimEnd()}...`;
};

type PreviewBlock = {
    heading: string;
    paragraph: string;
};

const getPreviewBlocks = (value: string): PreviewBlock[] => {
    const lines = value.replace(/\r\n/g, '\n').split('\n');
    const blocks: PreviewBlock[] = [];
    let currentHeading = '';
    let paragraphLines: string[] = [];

    const pushParagraph = () => {
        const paragraph = cleanMarkdownInline(paragraphLines.join(' '));
        if (paragraph) {
            blocks.push({ heading: currentHeading, paragraph });
        }
        paragraphLines = [];
    };

    for (const rawLine of lines) {
        const line = rawLine.trim();
        const headingMatch = line.match(/^###\s+(.+?)\s*$/);

        if (headingMatch) {
            pushParagraph();
            currentHeading = headingMatch[1].trim();
            continue;
        }

        if (shouldIgnoreLine(line)) {
            pushParagraph();
            continue;
        }

        paragraphLines.push(line);
    }

    pushParagraph();
    return blocks;
};

export const stripMarkdown = (value: string) =>
    value
        .replace(/```[\s\S]*?```/g, ' ')
        .replace(/`([^`]+)`/g, '$1')
        .replace(/\[([^\]]+)\]\(([^)]+)\)/g, '$1')
        .replace(/[#>*_~|-]/g, ' ')
        .replace(/\s+/g, ' ')
        .trim();

export const getWordCount = (value: string) => {
    const plainText = stripMarkdown(value);
    return plainText ? plainText.split(' ').length : 0;
};

export const getSectionPreview = (value: string) => {
    const blocks = getPreviewBlocks(value);

    const preferredBlock = blocks.find((block) =>
        PREFERRED_HEADINGS.some((pattern) => pattern.test(block.heading)),
    );
    if (preferredBlock) {
        return truncatePreview(preferredBlock.paragraph);
    }

    const fallbackBlock = blocks.find((block) => block.paragraph);
    if (fallbackBlock) {
        return truncatePreview(fallbackBlock.paragraph);
    }

    const plainText = stripMarkdown(value);
    if (!plainText) {
        return DEFAULT_PREVIEW;
    }

    return truncatePreview(plainText);
};
