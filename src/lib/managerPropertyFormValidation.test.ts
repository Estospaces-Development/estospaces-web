import assert from "node:assert/strict";
import test from "node:test";

import {
  getManagerPropertyFirstErrorStep,
  getManagerPropertyRoomPayload,
  getManagerPropertyTypeCategory,
  isManagerPropertyFieldApplicable,
  validateManagerPropertyField,
  validateManagerPropertyForm,
  validateManagerPropertySave,
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

test("validateManagerPropertyField rejects coordinates outside the selected country", () => {
  const values = {
    ...baseValues,
    latitude: "51.5072",
    longitude: "-0.1276",
  };

  assert.equal(
    validateManagerPropertyField("latitude", values),
    "Saved map position must be inside the selected country",
  );
  assert.equal(
    validateManagerPropertyField("longitude", values),
    "Saved map position must be inside the selected country",
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

test("validateManagerPropertyField allows valid multi-floor buildings", () => {
  assert.equal(
    validateManagerPropertyField("totalFloors", {
      ...baseValues,
      floorNumber: 10,
      totalFloors: 11,
    }),
    null,
  );
});

test("validateManagerPropertyField requires a map location and keeps alternate phone optional", () => {
  assert.equal(
    validateManagerPropertyField("latitude", { ...baseValues, latitude: "" }),
    "Find the entered address or use your current location",
  );
  assert.equal(
    validateManagerPropertyField("longitude", {
      ...baseValues,
      longitude: "",
    }),
    "Find the entered address or use your current location",
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

test('postal validation accepts a city when the PIN hint names a locality within it', () => {
  assert.equal(validateManagerPropertyField('postalCode', {
    ...baseValues, country: 'India', countryCode: 'IN', stateCode: 'DL', city: 'New Delhi', postalCode: '110075',
  }), null);
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

const legacyPublishedValues: ManagerPropertyValidationValues = {
  ...baseValues,
  propertyType: "apartment",
  state: "",
  stateId: "",
  stateCode: "",
  latitude: "",
  longitude: "",
};

test("validateManagerPropertySave lets an unchanged legacy listing save", () => {
  assert.deepEqual(
    validateManagerPropertySave(legacyPublishedValues, {
      baseline: legacyPublishedValues,
      requiresCompleteListing: false,
    }),
    {},
  );
  assert.deepEqual(
    validateManagerPropertySave(
      { ...legacyPublishedValues, description: "Updated note only." },
      { baseline: legacyPublishedValues, requiresCompleteListing: false },
    ),
    {},
  );
});

test("validateManagerPropertySave still validates the fields a manager changes", () => {
  const errors = validateManagerPropertySave(
    { ...legacyPublishedValues, title: " ", hasImages: false },
    { baseline: legacyPublishedValues, requiresCompleteListing: false },
  );

  assert.deepEqual(Object.keys(errors).sort(), ["images", "title"]);
});

test("validateManagerPropertySave re-checks dependent fields when an input changes", () => {
  const errors = validateManagerPropertySave(
    { ...legacyPublishedValues, totalArea: 500, carpetArea: 750 },
    { baseline: legacyPublishedValues, requiresCompleteListing: false },
  );

  assert.equal(errors.carpetArea, "Carpet area cannot exceed total area");
  assert.equal(errors.latitude, undefined);
});

test("validateManagerPropertySave applies every requirement to submissions and new listings", () => {
  const submission = validateManagerPropertySave(legacyPublishedValues, {
    baseline: legacyPublishedValues,
    requiresCompleteListing: true,
  });
  assert.equal(submission.state, "State/Province is required");
  assert.ok(submission.latitude);

  const created = validateManagerPropertySave(legacyPublishedValues, {
    baseline: null,
    requiresCompleteListing: false,
  });
  assert.equal(created.state, "State/Province is required");
});

test("Land does not require or validate residential rooms and floors", () => {
  const land: ManagerPropertyValidationValues = {
    ...baseValues,
    propertyType: "land",
    bedrooms: undefined,
    bathrooms: undefined,
    balconies: undefined,
    parkingSpaces: undefined,
    floorNumber: 4,
    totalFloors: undefined,
  };

  assert.deepEqual(validateManagerPropertyForm(land), {});
  assert.equal(getManagerPropertyTypeCategory("land"), "land");
  assert.equal(isManagerPropertyFieldApplicable("bedrooms", "land"), false);
  assert.equal(isManagerPropertyFieldApplicable("facing", "land"), true);
});

test("non-residential types make bedrooms, bathrooms and balconies optional", () => {
  for (const propertyType of ["commercial", "industrial", "office"] as const) {
    const values: ManagerPropertyValidationValues = {
      ...baseValues,
      propertyType,
      bedrooms: undefined,
      bathrooms: undefined,
      balconies: undefined,
    };
    assert.deepEqual(validateManagerPropertyForm(values), {}, propertyType);
    assert.equal(
      validateManagerPropertyField("bathrooms", { ...values, bathrooms: 1.5 }),
      "Bathrooms must be a whole number",
    );
    assert.equal(
      validateManagerPropertyField("parkingSpaces", { ...values, parkingSpaces: undefined }),
      "Parking spaces is required",
    );
  }
});

test("residential types still require rooms", () => {
  const errors = validateManagerPropertyForm({
    ...baseValues,
    propertyType: "apartment",
    bedrooms: undefined,
    bathrooms: undefined,
  });

  assert.equal(errors.bedrooms, "Bedrooms is required");
  assert.equal(errors.bathrooms, "Bathrooms is required");
});

test("changing a legacy listing to a residential type requires its rooms", () => {
  const legacyLand: ManagerPropertyValidationValues = {
    ...legacyPublishedValues,
    propertyType: "land",
    bedrooms: undefined,
    bathrooms: undefined,
  };
  const errors = validateManagerPropertySave(
    { ...legacyLand, propertyType: "house" },
    { baseline: legacyLand, requiresCompleteListing: false },
  );

  assert.equal(errors.bedrooms, "Bedrooms is required");
  assert.equal(errors.bathrooms, "Bathrooms is required");
  assert.equal(errors.state, undefined);
});

test("getManagerPropertyRoomPayload clears room metadata for Land only", () => {
  const rooms = {
    bedrooms: 2,
    bathrooms: 1,
    balconies: 1,
    parkingSpaces: 1,
    floorNumber: 1,
    totalFloors: 3,
  };

  assert.deepEqual(getManagerPropertyRoomPayload("land", rooms), {
    bedrooms: 0,
    bathrooms: 0,
    balconies: 0,
    parkingSpaces: 0,
    floorNumber: undefined,
    totalFloors: undefined,
  });
  assert.deepEqual(getManagerPropertyRoomPayload("office", rooms), rooms);
  assert.deepEqual(getManagerPropertyRoomPayload("apartment", rooms), rooms);
});

test("getManagerPropertyRoomPayload keeps a ground floor of 0 and sends null for an empty floor", () => {
  const rooms = {
    bedrooms: 2,
    bathrooms: 1,
    balconies: 0,
    parkingSpaces: 0,
    floorNumber: 0,
    totalFloors: 3,
  };

  assert.equal(getManagerPropertyRoomPayload("apartment", rooms).floorNumber, 0);
  assert.equal(
    getManagerPropertyRoomPayload("apartment", { ...rooms, floorNumber: undefined }).floorNumber,
    null,
  );
  assert.equal(
    getManagerPropertyRoomPayload("land", { ...rooms, floorNumber: undefined }).floorNumber,
    undefined,
  );
});
