import assert from 'node:assert/strict';
import test from 'node:test';
import { act, StrictMode, useState } from 'react';
import { createRoot } from 'react-dom/client';
import { Window } from 'happy-dom';

import AddressSection, { type AddressFormData } from './AddressSection';

const india: AddressFormData = {
    countryId: '2', countryName: 'India', countryCode: 'IN',
    stateId: '201', stateName: 'Tamil Nadu', stateCode: 'TN',
    cityId: '2001', cityName: 'Chennai', postalCode: '600001',
    addressLine1: 'Test street', addressLine2: 'Unit 2',
    neighborhood: 'Test area', landmark: 'Test landmark',
};
const uk: AddressFormData = {
    ...india, countryId: '1', countryName: 'United Kingdom', countryCode: 'GB',
    stateId: '101', stateName: 'England', stateCode: 'ENG',
    cityId: '1001', cityName: 'London', postalCode: 'SW1A1AA',
};

async function mountAddress(initial: AddressFormData) {
    const window = new Window({ url: 'https://estospaces.test/manager/properties/add' });
    const globals = {
        window, document: window.document, navigator: window.navigator,
        HTMLElement: window.HTMLElement, Element: window.Element, Node: window.Node,
        IS_REACT_ACT_ENVIRONMENT: true,
    };
    const descriptors = new Map(Object.keys(globals).map(key => [key, Object.getOwnPropertyDescriptor(globalThis, key)]));
    for (const [key, value] of Object.entries(globals)) {
        Object.defineProperty(globalThis, key, { configurable: true, writable: true, value });
    }
    const host = window.document.createElement('div');
    window.document.body.append(host);
    const root = createRoot(host as unknown as HTMLDivElement);
    let latest = initial;
    const Harness = () => {
        const [value, setValue] = useState(initial);
        latest = value;
        return <AddressSection value={value} onChange={setValue} fieldIdPrefix="country-test" />;
    };
    const restore = async () => {
        await act(async () => root.unmount());
        for (const [key, descriptor] of descriptors) {
            if (descriptor) Object.defineProperty(globalThis, key, descriptor);
            else Reflect.deleteProperty(globalThis, key);
        }
        await window.happyDOM.close();
    };
    try {
        await act(async () => root.render(<StrictMode><Harness /></StrictMode>));
    } catch (error) {
        await restore();
        throw error;
    }
    return {
        value: () => latest,
        country: () => window.document.querySelector('select')!.value,
        city: () => window.document.querySelectorAll('select')[2],
        changeCountry: async (id: string) => {
            const select = window.document.querySelector('select');
            assert.ok(select);
            await act(async () => {
                select.value = id;
                select.dispatchEvent(new window.Event('change', { bubbles: true }));
            });
        },
        restore,
    };
}

test('reopening a saved address leaves the loaded city selectable', async () => {
    const form = await mountAddress(india);
    try {
        assert.equal(form.city()?.value, '2001');
        assert.equal(form.city()?.disabled, false);
    } finally { await form.restore(); }
});

for (const [name, initial, target, expectedName, expectedCode] of [
    ['India to UK', india, '1', 'United Kingdom', 'GB'],
    ['UK to India', uk, '2', 'India', 'IN'],
] as const) {
    test(`explicit ${name} choice is not reversed by the previous postcode`, async () => {
        const form = await mountAddress(initial);
        try {
            await form.changeCountry(target);
            assert.equal(form.country(), target);
            assert.equal(form.value().countryName, expectedName);
            assert.equal(form.value().countryCode, expectedCode);
            assert.equal(form.value().postalCode, '');
            assert.equal(form.value().stateId, '');
            assert.equal(form.value().cityId, '');
            assert.equal(form.value().addressLine1, 'Test street');
            assert.equal(form.value().addressLine2, 'Unit 2');
        } finally { await form.restore(); }
    });
}

test('same-country selection retains a compatible postal code', async () => {
    const form = await mountAddress(india);
    try {
        await form.changeCountry('2');
        assert.equal(form.country(), '2');
        assert.equal(form.value().postalCode, '600001');
    } finally { await form.restore(); }
});

test('clearing the country is not undone by its previous postcode', async () => {
    const form = await mountAddress(uk);
    try {
        await form.changeCountry('');
        assert.equal(form.country(), '');
        assert.equal(form.value().postalCode, '');
    } finally { await form.restore(); }
});

test('postcode inference still corrects a mismatched loaded country', async () => {
    const form = await mountAddress({ ...india, postalCode: 'SW1A1AA' });
    try {
        assert.equal(form.country(), '1');
        assert.equal(form.value().postalCode, 'SW1A1AA');
    } finally { await form.restore(); }
});
