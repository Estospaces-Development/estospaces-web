import assert from "node:assert/strict";
import test from "node:test";

import {
  getCitiesByState,
  getCountries,
  getStatesByCountry,
  resolveAddressToIds,
} from "./addressService";

test("address service exposes India as the launch default with INR", async () => {
  const { data: countries, error } = await getCountries();

  assert.equal(error, null);
  assert.equal(countries?.length, 1);
  assert.equal(countries?.[0]?.code, "IN");
  assert.equal(countries?.[0]?.name, "India");
  assert.equal(countries?.[0]?.currency_code, "INR");
  assert.equal(countries?.some((country) => country.code === "GB"), false);
});

test("address service resolves a usable India state and city for property creation", async () => {
  const resolved = await resolveAddressToIds("India", "IN", "Tamil Nadu", "Chennai");

  assert.equal(resolved.error, null);
  assert.equal(resolved.countryId, "2");
  assert.equal(resolved.stateId, "201");
  assert.equal(resolved.cityId, "2001");

  const states = await getStatesByCountry(resolved.countryId || "");
  assert.equal(states.data?.some((state) => state.name === "Tamil Nadu"), true);

  const cities = await getCitiesByState(resolved.stateId || "");
  assert.equal(cities.data?.some((city) => city.name === "Chennai"), true);
});

test("address service does not expose legacy UK geography during India-only launch", async () => {
  const legacyStates = await getStatesByCountry("1");
  const legacyCities = await getCitiesByState("102");

  assert.deepEqual(legacyStates.data, []);
  assert.deepEqual(legacyCities.data, []);
});
