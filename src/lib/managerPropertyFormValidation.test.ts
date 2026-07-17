import assert from "node:assert/strict";
import test from "node:test";

import {
  getManagerPropertyFirstErrorStep,
  validateManagerPropertyField,
  validateManagerPropertyForm,
  validateManagerPropertyStep,
  type ManagerPropertyValidationValues,
} from "@/lib/managerPropertyFormValidation";

const baseValues: ManagerPropertyValidationValues = {
  title: "Example Property",
  priceAmount: 250000,
  addressLine1: "10 Example Street",
  country: "India",
  countryId: "2",
  countryCode: "IN",
  state: "Tamil Nadu",
  stateId: "state-1",
  stateCode: "TN",
  city: "Chennai",
  cityId: "city-1",
  postalCode: "600001",
  latitude: "13.0827",
  longitude: "80.2707",
  totalArea: 900,
  carpetArea: 750,
  bedrooms: 3,
  bathrooms: 2,
  balconies: 1,
  parkingSpaces: 1,
  floorNumber: 1,
  totalFloors: 2,
  yearBuilt: 2024,
  description: "A clear and useful property description.",
  hasImages: true,
  contactName: "Alex Agent",
  contactEmail: "alex@example.com",
  contactPhone: "+919876543210",
  alternatePhone: "",
  availableFrom: "2026-04-10",
  listingType: "rent",
  minimumLease: 12,
  deposit: 1200,
  maintenanceCharges: 100,
};

test("validateManagerPropertyStep blocks numeric overflow on the owning step", () => {
  const errors = validateManagerPropertyStep(1, {
    ...baseValues,
    priceAmount: 10000000000.01,
  });

  assert.equal(errors.priceAmount, "Price exceeds the supported numeric limit");
});

test("validateManagerPropertyField validates coordinate bounds and precision", () => {
  assert.equal(
    validateManagerPropertyField("latitude", {
      ...baseValues,
      latitude: "123.123456789",
    }),
    "Latitude must be between -90 and 90",
  );
  assert.equal(
    validateManagerPropertyField("longitude", {
      ...baseValues,
      longitude: "-12.123456789",
    }),
    "Longitude can have at most 8 decimal places",
  );
});

test("validateManagerPropertyForm returns the first invalid step correctly", () => {
  const fieldErrors = validateManagerPropertyForm({
    ...baseValues,
    postalCode: "SW1A 1AA",
    contactPhone: "123",
  });

  assert.equal(fieldErrors.postalCode, "Please enter a valid 6-digit Indian PIN code");
  assert.equal(fieldErrors.contactPhone, "Please enter a valid phone number");
  assert.equal(getManagerPropertyFirstErrorStep(fieldErrors), 2);
});

test("validateManagerPropertyForm selects postcode rules from India or UK country", () => {
  const ukErrors = validateManagerPropertyForm({
    ...baseValues,
    country: "United Kingdom",
    countryId: "1",
    countryCode: "GB",
    postalCode: "SW1A 1AA",
  });

  assert.equal(ukErrors.country, undefined);
  assert.equal(ukErrors.postalCode, undefined);

  const wrongUkCodeErrors = validateManagerPropertyForm({
    ...baseValues,
    country: "United Kingdom",
    countryId: "1",
    countryCode: "GB",
    postalCode: "600001",
  });

  assert.equal(wrongUkCodeErrors.postalCode, "Please enter a valid UK postcode");
});

test("validateManagerPropertyForm uses country-specific required location-code copy", () => {
  const indiaErrors = validateManagerPropertyForm({
    ...baseValues,
    country: "India",
    countryId: "1",
    countryCode: "IN",
    postalCode: "",
  });

  assert.equal(indiaErrors.postalCode, "PIN code is required");

  const ukErrors = validateManagerPropertyForm({
    ...baseValues,
    country: "United Kingdom",
    countryId: "2",
    countryCode: "GB",
    postalCode: "",
  });

  assert.equal(ukErrors.postalCode, "Postcode is required");
});

test("validateManagerPropertyForm enforces floor relationships and optional money rules", () => {
  const fieldErrors = validateManagerPropertyForm({
    ...baseValues,
    floorNumber: 5,
    totalFloors: 3,
    maintenanceCharges: 10.123,
  });

  assert.equal(
    fieldErrors.floorNumber,
    "Floor number cannot exceed total floors",
  );
  assert.equal(
    fieldErrors.totalFloors,
    "Total floors must be greater than or equal to floor number",
  );
  assert.equal(
    fieldErrors.maintenanceCharges,
    "Maintenance charges can have at most 2 decimal places",
  );
});

test("validateManagerPropertyField accepts optional blank coordinates and alternate phone", () => {
  assert.equal(
    validateManagerPropertyField("latitude", { ...baseValues, latitude: "" }),
    null,
  );
  assert.equal(
    validateManagerPropertyField("alternatePhone", {
      ...baseValues,
      alternatePhone: "",
    }),
    null,
  );
});

test("validateManagerPropertyField enforces full description length", () => {
  assert.equal(
    validateManagerPropertyField("description", {
      ...baseValues,
      description: "x".repeat(1001),
    }),
    "Full description must be 1000 characters or fewer",
  );
});

test("validateManagerPropertyField rejects phone numbers exceeding 15 digits (#283)", () => {
  const tooLong = validateManagerPropertyField("contactPhone", {
    ...baseValues,
    contactPhone: "6457475343464575",
  });
  assert.equal(tooLong, "Please enter a valid phone number");

  const withinLimit = validateManagerPropertyField("contactPhone", {
    ...baseValues,
    contactPhone: "+919876543210",
  });
  assert.equal(withinLimit, null);
});

test("validateManagerPropertyField rejects PIN code that mismatches selected state (#281)", () => {
  const mismatch = validateManagerPropertyField("postalCode", {
    ...baseValues,
    country: "India",
    countryCode: "IN",
    stateCode: "DL",
    postalCode: "600005",
  });
  assert.equal(mismatch, "PIN code does not match the selected state");

  const correct = validateManagerPropertyField("postalCode", {
    ...baseValues,
    country: "India",
    countryCode: "IN",
    stateCode: "TN",
    postalCode: "600001",
  });
  assert.equal(correct, null);

  const noState = validateManagerPropertyField("postalCode", {
    ...baseValues,
    country: "India",
    countryCode: "IN",
    stateCode: "",
    postalCode: "600001",
  });
  assert.equal(noState, null);
});
