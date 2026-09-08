import assert from 'node:assert/strict';
import { readFileSync } from 'node:fs';
import { createRequire } from 'node:module';
import { resolve } from 'node:path';
import test from 'node:test';
import React, { act } from 'react';
import { createRoot } from 'react-dom/client';
import { renderToStaticMarkup } from 'react-dom/server';
import { Window } from 'happy-dom';
import ts from 'typescript';

import { APPLICATION_STATUS, type Application } from '@/contexts/ApplicationsContext';

const require = createRequire(import.meta.url);
const source = readFileSync(new URL('./ApplicationCard.tsx', import.meta.url), 'utf8');
const compiled = ts.transpileModule(source, {
    compilerOptions: {
        module: ts.ModuleKind.CommonJS, jsx: ts.JsxEmit.ReactJSX,
        esModuleInterop: true, target: ts.ScriptTarget.ES2022,
    },
}).outputText;
const componentModule = { exports: {} as { default: React.ComponentType<{
    application: Application; onClick: () => void;
}> } };
const load = (id: string): unknown => {
    if (id === 'react-router-dom') return { useNavigate: () => () => undefined };
    if (id === '@/contexts/AuthContext') return { useAuth: () => ({ user: null }) };
    if (id === '@/contexts/ToastContext') return { useToast: () => ({ error() {} }) };
    return require(id.startsWith('@/') ? resolve(process.cwd(), 'src', id.slice(2)) : id);
};
new Function('require', 'module', 'exports', compiled)(load, componentModule, componentModule.exports);

for (const status of Object.values(APPLICATION_STATUS)) {
    test(`Activity ${status}: the primary action shares a row with Message, never Withdraw`, () => {
        const window = new Window();
        try {
            const markup = renderToStaticMarkup(<componentModule.exports.default
                application={{ id: 'application-fixture', status, createdAt: '2026-09-08T10:00:00Z',
                    propertyTitle: 'A home with a long descriptive title', propertyCountry: 'GB',
                    propertyPrice: 1250, listingType: 'rent' }} onClick={() => undefined} />);
            window.document.body.innerHTML = markup;
            const message = window.document.querySelector('button[aria-label="Message agent"]');
            assert.ok(message);
            const label = status === 'draft' ? 'Continue' : status === 'documents_requested' ? 'Upload' : 'View';
            const buttons = [...window.document.querySelectorAll('button')];
            const primary = buttons.find((button) => button.textContent.trim() === label);
            assert.ok(primary, 'The primary action must retain a visible text label');
            const row = primary.parentElement;
            assert.equal(message.parentElement, row, 'Message and the primary action remain grouped');
            assert.equal(row?.querySelectorAll('button').length, 2,
                'Conditional withdrawal must not displace the primary action into the icon column');
            assert.ok(row?.classList.contains('grid-cols-[44px_minmax(0,1fr)]'),
                'The text action needs the flexible column, not a second fixed icon column');
            assert.ok(primary.classList.contains('min-h-11'), 'Keep the existing touch target');
            const withdraw = buttons.find((button) => button.textContent.trim() === 'Withdraw');
            const expectsWithdraw = !['withdrawn', 'approved', 'rejected', 'completed'].includes(status);
            assert.equal(Boolean(withdraw), expectsWithdraw, 'Existing withdrawal eligibility is retained');
            if (withdraw) assert.equal(row?.contains(withdraw), false);
        } finally {
            window.happyDOM.abort();
        }
    });
}

test('Continue, Upload and View open the application exactly once without bubbling to the card', async () => {
    const window = new Window();
    const globals = { window, document: window.document, navigator: window.navigator,
        HTMLElement: window.HTMLElement, Node: window.Node, IS_REACT_ACT_ENVIRONMENT: true };
    const descriptors = new Map(Object.keys(globals).map((key) => [key, Object.getOwnPropertyDescriptor(globalThis, key)]));
    for (const [key, value] of Object.entries(globals)) {
        Object.defineProperty(globalThis, key, { configurable: true, writable: true, value });
    }
    const container = window.document.createElement('div');
    window.document.body.append(container);
    const root = createRoot(container as unknown as HTMLElement);
    try {
        for (const [status, label] of [
            ['draft', 'Continue'], ['documents_requested', 'Upload'], ['under_review', 'View'], ['approved', 'View'],
        ] as const) {
            let opened = 0;
            await act(async () => root.render(<componentModule.exports.default
                application={{ id: 'application-fixture', status, createdAt: '2026-09-08T10:00:00Z' }}
                onClick={() => { opened += 1; }} />));
            const button = [...container.querySelectorAll('button')].find((element) => element.textContent.trim() === label);
            assert.ok(button);
            await act(async () => button.click());
            assert.equal(opened, 1, `${label} must not also invoke the card's click handler`);
        }
    } finally {
        await act(async () => root.unmount());
        await window.happyDOM.abort();
        for (const [key, descriptor] of descriptors) {
            if (descriptor) Object.defineProperty(globalThis, key, descriptor);
            else Reflect.deleteProperty(globalThis, key);
        }
    }
});
