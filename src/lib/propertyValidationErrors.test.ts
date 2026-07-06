import assert from "node:assert/strict";
import test from "node:test";

import {
  isValidLocationCode,
  mapPropertyMutationFieldErrors,
} from "@/lib/propertyValidationErrors";

test("isValidLocationCode accepts Indian PIN codes and UK postcodes", () => {
  assert.equal(isValidLocationCode("600001"), true);
  assert.equal(isValidLocationCode("SW1A 1AA"), true);
});

test("isValidLocationCode rejects invalid location codes", () => {
  assert.equal(isValidLocationCode("INVALID"), false);
  assert.equal(isValidLocationCode("12345"), false);
});

test("mapPropertyMutationFieldErrors translates api fields to form fields", () => {
  assert.deepEqual(
    mapPropertyMutationFieldErrors({
      price: "Price must be greater than 0",
      deposit_amount: "Security deposit exceeds the supported numeric limit",
      maintenance_charges:
        "Maintenance charges exceeds the supported numeric limit",
      address_line_1: "Street address is required",
      property_size_sqft: "Property area must be greater than 0",
      carpet_area: "Carpet area cannot exceed total property area",
      year_built: "Year built must be between 1800 and the current year",
      image_urls: "At least one image is required",
      agent_name: "Contact name is required",
      agent_email: "Please enter a valid email address",
      agent_phone: "Please enter a valid phone number",
      alternate_phone: "Please enter a valid alternate phone number",
      preferred_contact_method:
        "Please select a valid preferred contact method",
      license_number: "License number is required",
      available_from: "Please enter a valid availability date",
      minimum_lease: "Minimum lease must be at least 1 month",
      latitude: "Latitude must be between -90 and 90",
      longitude: "Longitude must be between -180 and 180",
      inclusions: "Inclusions are invalid",
      exclusions: "Exclusions are invalid",
      postcode: "Please enter a valid PIN code or postcode",
    }),
    {
      priceAmount: "Price must be greater than 0",
      deposit: "Security deposit exceeds the supported numeric limit",
      maintenanceCharges:
        "Maintenance charges exceeds the supported numeric limit",
      addressLine1: "Street address is required",
      totalArea: "Property area must be greater than 0",
      carpetArea: "Carpet area cannot exceed total property area",
      yearBuilt: "Year built must be between 1800 and the current year",
      images: "At least one image is required",
      contactName: "Contact name is required",
      contactEmail: "Please enter a valid email address",
      contactPhone: "Please enter a valid phone number",
      alternatePhone: "Please enter a valid alternate phone number",
      preferredContactMethod: "Please select a valid preferred contact method",
      licenseNumber: "License number is required",
      availableFrom: "Please enter a valid availability date",
      minimumLease: "Minimum lease must be at least 1 month",
      latitude: "Latitude must be between -90 and 90",
      longitude: "Longitude must be between -180 and 180",
      inclusions: "Inclusions are invalid",
      exclusions: "Exclusions are invalid",
      postalCode: "Please enter a valid PIN code or postcode",
    },
  );
});
