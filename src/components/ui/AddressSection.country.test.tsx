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
    const cityInput = () => {
        const input = window.document.getElementById('country-test-city');
        assert.ok(input instanceof window.HTMLInputElement);
        return input;
    };
    return {
        value: () => latest,
        document: window.document,
        click: async (element: { click: () => void }) => { await act(async () => element.click()); },
        country: () => window.document.querySelector('select')!.value,
        city: cityInput,
        cityInput,
        changeCity: async (name: string) => {
            const input = cityInput();
            await act(async () => {
                input.value = name;
                input.dispatchEvent(new window.Event('input', { bubbles: true }));
            });
        },
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

test('a saved city outside the suggestions remains visible without a fabricated city ID', async () => {
    const form = await mountAddress({ ...india, cityId: '', cityName: 'Tiruchirappalli', postalCode: '620001' });
    try {
        assert.equal(form.cityInput()?.tagName, 'INPUT');
        assert.equal(form.cityInput()?.value, 'Tiruchirappalli');
        assert.equal(form.value().cityId, '');
        assert.equal(form.value().stateId, '201');
    } finally { await form.restore(); }
});

test('reopening a saved address leaves the loaded city editable', async () => {
    const form = await mountAddress(india);
    try {
        assert.equal(form.city()?.value, 'Chennai');
        assert.equal(form.city()?.disabled, false);
    } finally { await form.restore(); }
});

test('entering a missing city clears the old suggestion ID without changing the postal address', async () => {
    const form = await mountAddress(india);
    try {
        await form.changeCity('Tiruchirappalli');
        assert.equal(form.value().cityName, 'Tiruchirappalli');
        assert.equal(form.value().cityId, '');
        assert.equal(form.value().stateId, '201');
        assert.equal(form.value().postalCode, '600001');
        await form.changeCity('Chennai');
        assert.equal(form.value().cityId, '2001');
        await form.changeCity('');
        assert.equal(form.value().cityId, '');
        assert.equal(form.value().cityName, '');
    } finally { await form.restore(); }
});

test('UK towns outside the suggestions can be entered and are cleared on country switch', async () => {
    const form = await mountAddress(uk);
    try {
        await form.changeCity('Reading');
        assert.equal(form.value().cityName, 'Reading');
        assert.equal(form.value().cityId, '');
        await form.changeCountry('2');
        assert.equal(form.city()?.value, '');
        assert.equal(form.city()?.disabled, true);
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

const bengaluru: AddressFormData = {
    ...india, stateId: '202', stateName: 'Karnataka', stateCode: 'KA',
    cityId: '2010', cityName: 'Bengaluru', postalCode: '560001',
};

test('the city arrow opens every suggestion for the state even when a city is entered', async () => {
    const form = await mountAddress(bengaluru);
    try {
        assert.equal(form.cityInput().getAttribute('list'), null, 'no native datalist arrow that cannot open');
        const toggle = form.document.querySelector('button[aria-label="Show city suggestions"]');
        assert.ok(toggle, 'city field offers a working suggestions button');
        await form.click(toggle as unknown as HTMLButtonElement);
        const options = [...form.document.querySelectorAll('[role="option"]')].map(option => option.textContent);
        assert.deepEqual(options, ['Bengaluru', 'Mysuru', 'Mangaluru']);
        assert.equal(form.cityInput().getAttribute('aria-expanded'), 'true');
        await form.click(form.document.querySelectorAll('[role="option"]')[1] as unknown as HTMLElement);
        assert.equal(form.value().cityName, 'Mysuru');
        assert.equal(form.value().cityId, '2011');
        assert.equal(form.document.querySelector('[role="listbox"]'), null, 'list closes after a choice');
    } finally { await form.restore(); }
});

test('typing a former city name suggests the current name', async () => {
    const form = await mountAddress({ ...bengaluru, cityId: '', cityName: '' });
    try {
        await form.changeCity('Bangalore');
        const options = [...form.document.querySelectorAll('[role="option"]')].map(option => option.textContent);
        assert.deepEqual(options, ['Bengaluru']);
    } finally { await form.restore(); }
});

test('a state without suggestions shows no dead dropdown arrow', async () => {
    const form = await mountAddress({ ...india, stateId: '999', stateName: 'Unlisted', cityId: '', cityName: 'Somewhere' });
    try {
        assert.equal(form.document.querySelector('button[aria-label="Show city suggestions"]'), null);
    } finally { await form.restore(); }
});
