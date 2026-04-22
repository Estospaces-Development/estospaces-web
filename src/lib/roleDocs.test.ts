import assert from 'node:assert/strict';
import test from 'node:test';
import { parseRoleDocs, slugifyHeading } from './roleDocs';

test('slugifyHeading normalizes punctuation and spacing', () => {
    assert.equal(slugifyHeading('Fast-Track 24h'), 'fast-track-24h');
    assert.equal(slugifyHeading('What the Estospaces Team Reviews'), 'what-the-estospaces-team-reviews');
});

test('parseRoleDocs separates intro from sections', () => {
    const markdown = [
        'Intro line one.',
        '',
        'Intro line two.',
        '',
        '## Start Here',
        'Body one.',
        '',
        '## Next Stage',
        'Body two.',
    ].join('\n');

    const parsed = parseRoleDocs(markdown);

    assert.equal(parsed.intro, 'Intro line one.\n\nIntro line two.');
    assert.equal(parsed.sections.length, 2);
    assert.equal(parsed.sections[0]?.title, 'Start Here');
    assert.equal(parsed.sections[0]?.slug, 'start-here');
    assert.equal(parsed.sections[0]?.body, 'Body one.');
});

test('parseRoleDocs makes duplicate headings unique', () => {
    const markdown = [
        '## Workflow',
        'First body.',
        '',
        '## Workflow',
        'Second body.',
    ].join('\n');

    const parsed = parseRoleDocs(markdown);

    assert.deepEqual(
        parsed.sections.map((section) => section.slug),
        ['workflow', 'workflow-2'],
    );
});
