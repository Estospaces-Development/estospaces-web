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
