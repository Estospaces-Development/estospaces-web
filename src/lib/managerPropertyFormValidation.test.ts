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
  country: "United Kingdom",
  countryId: "GB",
  countryCode: "GB",
  state: "Belfast",
  stateId: "state-1",
  city: "Belfast",
  cityId: "city-1",
  postalCode: "BT9 7GG",
  latitude: "54.5973",
  longitude: "-5.9301",
  totalArea: 900,
  carpetArea: 750,
  bedrooms: 3,
  bathrooms: 2,
  balconies: 1,
  parkingSpaces: 1,
  floorNumber: 1,
  totalFloors: 2,
  yearBuilt: 2024,
  hasImages: true,
  contactName: "Alex Agent",
  contactEmail: "alex@example.com",
  contactPhone: "+441234567890",
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
    postalCode: "INVALID",
    contactPhone: "123",
  });

  assert.equal(fieldErrors.postalCode, "Please enter a valid UK postcode");
  assert.equal(fieldErrors.contactPhone, "Please enter a valid phone number");
  assert.equal(getManagerPropertyFirstErrorStep(fieldErrors), 2);
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
