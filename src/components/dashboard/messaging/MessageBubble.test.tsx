import assert from 'node:assert/strict';
import test from 'node:test';
import React from 'react';
import { renderToStaticMarkup } from 'react-dom/server';
import { MemoryRouter } from 'react-router-dom';

import MessageBubble from './MessageBubble';
import { ToastProvider } from '@/contexts/ToastContext';

const renderAttachment = (fileName: string, mimeType: string) => renderToStaticMarkup(
    <MemoryRouter initialEntries={['/manager/messages']}>
        <ToastProvider>
            <MessageBubble
                isUser={false}
                message={{
                    timestamp: '2026-09-03T10:00:00Z',
                    attachments: [{
                        file_url: 'https://media.estospaces.test/download/file',
                        file_name: fileName,
                        mime_type: mimeType,
                    }],
                }}
            />
        </ToastProvider>
    </MemoryRouter>,
);

test('attachment download links expose a descriptive accessible name', () => {
    const pdfMarkup = renderAttachment('Tenancy agreement.pdf', 'application/pdf');
    const fileMarkup = renderAttachment('Inventory.csv', 'text/csv');

    assert.match(pdfMarkup, /aria-label="Download Tenancy agreement\.pdf"/);
    assert.match(fileMarkup, /aria-label="Download Inventory\.csv"/);
});

const renderChatAttachment = (attachment: { id?: string; file_url: string; file_name: string; mime_type?: string }) => renderToStaticMarkup(
    <MemoryRouter initialEntries={['/user/dashboard/messages']}>
        <ToastProvider>
            <MessageBubble
                isUser={false}
                message={{ timestamp: '2026-09-27T10:00:00Z', attachments: [attachment] }}
            />
        </ToastProvider>
    </MemoryRouter>,
);

test('chat attachments never render the raw media URL as a link or image source', () => {
    const privateUrl = 'https://media.estospaces.test/uploads/message/conv-1/secret.txt';
    for (const mimeType of ['text/plain', 'application/pdf', 'image/png']) {
        const markup = renderChatAttachment({ id: 'att-1', file_url: privateUrl, file_name: 'secret.txt', mime_type: mimeType });
        assert.equal(markup.includes(privateUrl), false, `${mimeType} attachment leaked its raw URL`);
        assert.doesNotMatch(markup, /<a [^>]*href=/);
    }
});

test('chat attachments open only once the server has issued an attachment id', () => {
    const withId = renderChatAttachment({ id: 'att-1', file_url: 'https://media.test/x', file_name: 'Lease.pdf', mime_type: 'application/pdf' });
    const withoutId = renderChatAttachment({ file_url: 'https://media.test/x', file_name: 'Lease.pdf', mime_type: 'application/pdf' });

    const buttonTag = (markup: string) => markup.match(/<button[^>]*aria-label="Download Lease\.pdf"[^>]*>/)?.[0] || '';
    assert.notEqual(buttonTag(withId), '');
    assert.doesNotMatch(buttonTag(withId), / disabled=""/);
    assert.match(buttonTag(withoutId), / disabled=""/);
});
