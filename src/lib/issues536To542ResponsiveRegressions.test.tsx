import assert from 'node:assert/strict';
import { readFileSync } from 'node:fs';
import test from 'node:test';
import { Window } from 'happy-dom';
import { renderToStaticMarkup } from 'react-dom/server';

import { SupportFilters } from '@/components/support/SupportFilters';
import * as supportCenterHelpers from '@/lib/supportCenter';

const source = (relativePath: string) => readFileSync(new URL(`../${relativePath}`, import.meta.url), 'utf8');

test('issue 536 keeps research refresh and new-session actions in one stable row', () => {
    const research = source('pages/admin/research/page.tsx');

    assert.match(research, /data-research-header-actions[^>]*className="[^"]*grid-cols-2[^"]*lg:shrink-0[^"]*lg:flex-nowrap/);
    assert.match(research, /data-research-refresh[^>]*className="[^"]*whitespace-nowrap/);
    assert.match(research, /data-research-refresh[^>]*className="[^"]*lg:min-w-\[7\.5rem\]/);
});

test('issue 537 contains long Fast Track document states inside every compact summary', () => {
    const workspace = source('components/fast-track/FastTrackWorkspace.tsx');
    const previewStart = workspace.indexOf('const previewDisplayItem');
    const previewEnd = workspace.indexOf('const renderDocumentsContent', previewStart);
    const preview = workspace.slice(previewStart, previewEnd);

    assert.match(preview, /data-fast-track-document-summary/);
    assert.match(preview, /min-w-0 flex-1/);
    assert.match(preview, /max-w-full[^"]*break-words/);
    assert.match(workspace, /className="[^"]*break-words[^"]*"[\s\S]{0,120}\{activeDocument\.fileName/);
});

test('issue 538 gives the Leads search a visible decorative icon and an accessible field name', () => {
    const leads = source('pages/manager/leads/page.tsx');

    assert.match(leads, /<Search[^>]*aria-hidden/);
    assert.match(leads, /aria-label="Search leads"/);
    assert.match(leads, /placeholder="Search by user name[^"]*"[\s\S]{0,220}pl-10/);
});

test('issue 539 stacks application navigation above review actions on a 283px viewport', () => {
    const application = source('components/manager/applications/ApplicationDetail.tsx');

    assert.match(application, /data-application-review-header[^>]*className="[^"]*flex-col[^"]*sm:flex-row/);
    assert.match(application, /data-application-review-actions[^>]*className="[^"]*w-full[^"]*sm:w-auto/);
    assert.match(application, /Back to Applications<\/span>/);
});

test('issue 540 centers the support icon against the input instead of its helper copy', () => {
    const markup = renderToStaticMarkup(
        <SupportFilters
            filters={{ search: '', status: '', priority: '' }}
            onChange={() => undefined}
            mode="requester"
        />,
    );
    const window = new Window();
    window.document.body.innerHTML = markup;
    const input = window.document.querySelector('input[aria-label="Search your support tickets"]');
    const control = input?.parentElement;

    assert.equal(control?.getAttribute('data-support-search-control'), 'true');
    assert.equal(control?.querySelector('svg')?.getAttribute('aria-hidden'), 'true');
    assert.equal(control?.nextElementSibling?.tagName, 'P');
});

test('issue 541 makes the unchanged Settings save state visibly and semantically inert', () => {
    const settings = source('pages/user/dashboard/settings/page.tsx');

    assert.match(settings, /title=\{!hasChanges \? 'No settings changes to save' : undefined\}/);
    assert.match(settings, /disabled:cursor-not-allowed/);
    assert.match(settings, /disabled:hover:bg-orange-400/);
    assert.match(settings, /disabled:active:scale-100/);
});

test('issue 542 reveals and focuses the new-ticket composer even when no ticket is selected', () => {
    const focusSupportTicketComposer = (supportCenterHelpers as typeof supportCenterHelpers & {
        focusSupportTicketComposer?: (target: HTMLElement | null) => void;
    }).focusSupportTicketComposer;
    assert.equal(typeof focusSupportTicketComposer, 'function');

    const window = new Window();
    const heading = window.document.createElement('h2');
    let scrollOptions: ScrollIntoViewOptions | undefined;
    heading.tabIndex = -1;
    heading.scrollIntoView = (options?: boolean | ScrollIntoViewOptions) => {
        scrollOptions = typeof options === 'object' ? options : undefined;
    };
    window.document.body.append(heading);

    focusSupportTicketComposer?.(heading as unknown as HTMLElement);

    assert.deepEqual(scrollOptions, { behavior: 'smooth', block: 'start' });
    assert.equal(window.document.activeElement, heading);

    const supportCenter = source('components/support/SupportCenter.tsx');
    assert.match(supportCenter, /onClick=\{handleStartNewTicket\}/);
    assert.match(supportCenter, /ref=\{composerHeadingRef\}/);
});
