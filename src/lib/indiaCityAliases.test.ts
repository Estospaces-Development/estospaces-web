import assert from "node:assert/strict";
import test from "node:test";

import { canonicalIndiaCityName, indiaCityNamesMatch } from "./indiaCityAliases";

test("Bengaluru and Bangalore match the India Post district for PIN 560001", () => {
  for (const city of ["Bengaluru", "Bangalore", " bengaluru ", "BANGALORE"]) {
    assert.equal(indiaCityNamesMatch(city, "Bengaluru Urban"), true, city);
  }
});

test("former city names match their current names", () => {
  for (const [entered, district] of [
    ["Mumbai", "Mumbai Suburban"],
    ["Bombay", "Mumbai City"],
    ["Chennai", "Madras"],
    ["Madras", "Chennai"],
    ["Kolkata", "Calcutta"],
    ["Gurugram", "Gurgaon"],
    ["Gurgaon", "Gurugram"],
    ["New Delhi", "Central Delhi"],
    ["Delhi", "South West Delhi"],
  ]) {
    assert.equal(indiaCityNamesMatch(entered, district), true, `${entered} / ${district}`);
  }
});

test("different cities and empty names never match", () => {
  for (const [entered, district] of [
    ["Mysuru", "Bengaluru Urban"],
    ["Pune", "Mumbai City"],
    ["Chennai", "Chennai outskirts"],
    ["Delhi", "Gurgaon"],
    ["", "Bengaluru Urban"],
    ["", ""],
  ]) {
    assert.equal(indiaCityNamesMatch(entered, district), false, `${entered} / ${district}`);
  }
});

test("canonical names use the current official spelling", () => {
  assert.equal(canonicalIndiaCityName("Bangalore"), "bengaluru");
  assert.equal(canonicalIndiaCityName("Bengaluru Rural"), "bengaluru");
  assert.equal(canonicalIndiaCityName("Tiruchirappalli"), "tiruchirappalli");
});
