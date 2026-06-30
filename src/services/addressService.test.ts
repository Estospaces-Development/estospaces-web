import assert from "node:assert/strict";
import test from "node:test";

import {
  getCitiesByState,
  getCountries,
  getStatesByCountry,
  resolveAddressToIds,
} from "./addressService";

test("address service keeps India first while exposing UK when location requires it", async () => {
  const { data: countries, error } = await getCountries();

  assert.equal(error, null);
  assert.equal(countries?.[0]?.code, "IN");
  assert.equal(countries?.[0]?.name, "India");
  assert.equal(countries?.[0]?.currency_code, "INR");
  assert.equal(countries?.some((country) => country.code === "GB"), true);
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

test("address service resolves a usable UK state and city when UK is selected", async () => {
  const resolved = await resolveAddressToIds("United Kingdom", "GB", "England", "London");

  assert.equal(resolved.error, null);
  assert.equal(resolved.countryId, "1");
  assert.equal(resolved.stateId, "101");
  assert.equal(resolved.cityId, "1001");

  const states = await getStatesByCountry(resolved.countryId || "");
  assert.equal(states.data?.some((state) => state.name === "England"), true);

  const cities = await getCitiesByState(resolved.stateId || "");
  assert.equal(cities.data?.some((city) => city.name === "London"), true);
});
