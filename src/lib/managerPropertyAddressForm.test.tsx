import assert from "node:assert/strict";
import test from "node:test";
import { act, StrictMode, useState } from "react";
import { Window } from "happy-dom";

import {
  applyAddressSectionChange,
  buildPropertyLocationPayload,
  type PropertyFormAddressFields,
} from "@/lib/managerPropertyAddressForm";
import { resolveAddressToIds } from "@/services/addressService";

// React DOM decides at load time whether the browser supports input events,
// so the DOM must exist before it is imported for typing to reach onChange.
const window = new Window({ url: "https://estospaces.test/manager/dashboard/properties/edit/qa" });
for (const [key, value] of Object.entries({
  window, document: window.document, navigator: window.navigator,
  HTMLElement: window.HTMLElement, Element: window.Element, Node: window.Node,
  IS_REACT_ACT_ENVIRONMENT: true,
})) {
  Object.defineProperty(globalThis, key, { configurable: true, writable: true, value });
}
const loadDomModules = async () => ({
  createRoot: (await import("react-dom/client")).createRoot,
  AddressSection: (await import("@/components/ui/AddressSection")).default,
  mapContextPropertyLocation: (await import("@/contexts/PropertyContext")).mapContextPropertyLocation,
});

// A saved draft as the edit page loads it from core: the city was typed as
// "Bangalore", the pin is set, and the catalog IDs are not stored.
const savedDraft: PropertyFormAddressFields = {
  countryId: "", country: "India", countryCode: "IN",
  stateId: "", state: "Karnataka", stateCode: "KA",
  cityId: "", city: "Bangalore",
  addressLine1: "Outer Ring Road", addressLine2: "Near the mega store",
  postalCode: "560001", neighborhood: "", landmark: "",
  latitude: "12.9811389", longitude: "77.5953611",
};

// Mirrors the edit page: hydrate catalog IDs, mount AddressSection with the
// page's change handler, then build the save payload the page sends.
async function mountEditForm() {
  const { createRoot, AddressSection, mapContextPropertyLocation } = await loadDomModules();
  const ids = await resolveAddressToIds(savedDraft.country, savedDraft.countryCode, savedDraft.state, savedDraft.city);
  const loaded: PropertyFormAddressFields = {
    ...savedDraft,
    countryId: ids.countryId || "",
    stateId: ids.stateId || "",
    cityId: ids.cityId || "",
  };
  let latest = loaded;
  const Page = () => {
    const [formData, setFormData] = useState(loaded);
    latest = formData;
    return (
      <AddressSection
        value={{
          countryId: formData.countryId, countryName: formData.country, countryCode: formData.countryCode,
          stateId: formData.stateId, stateName: formData.state, stateCode: formData.stateCode,
          cityId: formData.cityId, cityName: formData.city,
          addressLine1: formData.addressLine1, addressLine2: formData.addressLine2,
          postalCode: formData.postalCode, neighborhood: formData.neighborhood, landmark: formData.landmark,
        }}
        onChange={(addressData) => setFormData(applyAddressSectionChange(formData, addressData).next)}
        fieldIdPrefix="manager-property"
        initialCountry={formData.country}
        initialCountryCode={formData.countryCode}
        initialState={formData.state}
        initialCity={formData.city}
      />
    );
  };

  const host = window.document.createElement("div");
  window.document.body.append(host);
  const root = createRoot(host as unknown as HTMLDivElement);
  await act(async () => root.render(<StrictMode><Page /></StrictMode>));
  await act(async () => { await new Promise((resolve) => setTimeout(resolve, 20)); });

  const type = async (field: string, text: string) => {
    const input = window.document.getElementById(`manager-property-${field}`);
    assert.ok(input instanceof window.HTMLInputElement, field);
    await act(async () => {
      // The prototype setter bypasses React's value tracker, as real typing does.
      let proto: object | null = Object.getPrototypeOf(input);
      let setter: ((value: string) => void) | undefined;
      while (proto && !setter) {
        setter = Object.getOwnPropertyDescriptor(proto, "value")?.set;
        proto = Object.getPrototypeOf(proto);
      }
      assert.ok(setter, "input value setter");
      setter.call(input, text);
      input.dispatchEvent(new window.Event("input", { bubbles: true }));
    });
  };

  return {
    loaded,
    form: () => latest,
    type,
    savePayload: () => mapContextPropertyLocation({ location: buildPropertyLocationPayload(latest, loaded) }),
    restore: async () => {
      await act(async () => root.unmount());
      host.remove();
    },
  };
}

test("reopening a Bangalore draft keeps its pin through AddressSection and in the draft-save payload", async () => {
  const page = await mountEditForm();
  try {
    assert.equal(page.form().stateId, "202", "the draft's state resolves to the catalog");
    assert.equal(page.form().latitude, savedDraft.latitude, "normalising the address keeps the pin");
    assert.equal(page.form().longitude, savedDraft.longitude);

    await page.type("city", "Bengaluru");
    await page.type("addressLine2", "Opposite the metro");
    assert.equal(page.form().city, "Bengaluru");
    assert.equal(page.form().addressLine2, "Opposite the metro");
    assert.equal(page.form().latitude, savedDraft.latitude, "correcting the city keeps the pin");

    const payload = page.savePayload();
    assert.equal(payload.latitude, 12.9811389);
    assert.equal(payload.longitude, 77.5953611);
    assert.equal(payload.clear_location, undefined);
    assert.equal(payload.city, "Bengaluru");
  } finally {
    await page.restore();
  }
});

test("changing the PIN clears the pin and the draft save tells core to clear it", async () => {
  const page = await mountEditForm();
  try {
    await page.type("postalCode", "560066");
    assert.equal(page.form().postalCode, "560066");
    assert.equal(page.form().latitude, "");
    assert.equal(page.form().longitude, "");

    const payload = page.savePayload();
    assert.equal(payload.clear_location, true);
    assert.equal("latitude" in payload, false);
    assert.equal("longitude" in payload, false);
    assert.equal(payload.postcode, "560066");
  } finally {
    await page.restore();
  }
});

test("new listings and listings that never had a pin never send the clear signal", () => {
  const unpinned = { ...savedDraft, latitude: "", longitude: "" };
  assert.equal(buildPropertyLocationPayload(unpinned, null).clearLocation, undefined);
  assert.equal(buildPropertyLocationPayload(unpinned, unpinned).clearLocation, undefined);
  const repinned = buildPropertyLocationPayload({ ...savedDraft, latitude: "12.97", longitude: "77.64" }, savedDraft);
  assert.equal(repinned.clearLocation, undefined);
  assert.equal(repinned.latitude, 12.97);
});
