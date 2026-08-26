import assert from 'node:assert/strict';
import test from 'node:test';
import { act } from 'react';
import { createRoot } from 'react-dom/client';
import { BrowserRouter } from 'react-router-dom';
import { Window as HappyWindow } from 'happy-dom';

import {
    buildFastTrackDocumentSearchParams,
    buildFastTrackStageSearchParams,
} from '@/lib/fastTrackWorkspace';
import { useSerializedSearchParams } from '@/lib/useSerializedSearchParams';

const SearchParamsRaceProbe = () => {
    const [searchParams, setSearchParams] = useSerializedSearchParams();

    return (
        <button
            type="button"
            onClick={() => {
                setSearchParams((previous) => buildFastTrackStageSearchParams(previous, 'viewing', true));
                setSearchParams((previous) => buildFastTrackDocumentSearchParams(previous, 'identity'), {
                    replace: true,
                });
            }}
        >
            {searchParams.toString()}
        </button>
    );
};

test('BrowserRouter keeps a stage click when document focus updates in the same event', async () => {
    const browserWindow = new HappyWindow({
        url: 'https://estospaces.test/manager/fast-track?case=case-1&section=documents&document=address',
    });
    const keys = [
        'window',
        'document',
        'navigator',
        'HTMLElement',
        'Element',
        'Node',
        'Event',
        'IS_REACT_ACT_ENVIRONMENT',
    ] as const;
    const descriptors = new Map(keys.map((key) => [key, Object.getOwnPropertyDescriptor(globalThis, key)]));
    const globals: Record<(typeof keys)[number], unknown> = {
        window: browserWindow,
        document: browserWindow.document,
        navigator: browserWindow.navigator,
        HTMLElement: browserWindow.HTMLElement,
        Element: browserWindow.Element,
        Node: browserWindow.Node,
        Event: browserWindow.Event,
        IS_REACT_ACT_ENVIRONMENT: true,
    };
    Object.entries(globals).forEach(([key, value]) => {
        Object.defineProperty(globalThis, key, { configurable: true, writable: true, value });
    });

    const browserHost = browserWindow.document.createElement('div');
    browserWindow.document.body.append(browserHost);
    const host = browserHost as unknown as HTMLDivElement;
    const root = createRoot(host);

    try {
        await act(async () => {
            root.render(
                <BrowserRouter window={browserWindow as unknown as globalThis.Window}>
                    <SearchParamsRaceProbe />
                </BrowserRouter>,
            );
        });

        const button = browserWindow.document.querySelector('button');
        assert.ok(button);

        await act(async () => {
            button.dispatchEvent(new browserWindow.MouseEvent('click', { bubbles: true }));
        });

        const params = new URLSearchParams(browserWindow.location.search);
        assert.equal(params.get('section'), 'viewing');
        assert.equal(params.get('stage'), null);
        assert.equal(params.get('document'), 'identity');
        assert.equal(params.get('case'), 'case-1');
    } finally {
        act(() => root.unmount());
        for (const key of keys) {
            const descriptor = descriptors.get(key);
            if (descriptor) Object.defineProperty(globalThis, key, descriptor);
            else Reflect.deleteProperty(globalThis, key);
        }
        browserWindow.close();
    }
});
