import assert from "node:assert/strict";
import { readFileSync } from "node:fs";
import test from "node:test";
import { resolve } from "node:path";

import {
  CONTACT_AGENT_PHONE_ALLOWED_CHARACTERS_ERROR,
  CONTACT_AGENT_PHONE_LENGTH_ERROR,
  normalizeContactAgentPhone,
  validateContactAgentPhone,
} from "@/lib/contactAgentFormValidation";

const root = process.cwd();

test("contact agent phone validation rejects alphabetic input", () => {
  assert.equal(
    validateContactAgentPhone("ghjghjh"),
    CONTACT_AGENT_PHONE_ALLOWED_CHARACTERS_ERROR,
  );
  assert.equal(
    validateContactAgentPhone("abc1234567"),
    CONTACT_AGENT_PHONE_ALLOWED_CHARACTERS_ERROR,
  );
});

test("contact agent phone validation allows blank optional phone and real callback numbers", () => {
  assert.equal(validateContactAgentPhone(""), null);
  assert.equal(validateContactAgentPhone("+91 98765 43210"), null);
  assert.equal(validateContactAgentPhone("+44 20 7946 0958"), null);
  assert.equal(validateContactAgentPhone("123"), CONTACT_AGENT_PHONE_LENGTH_ERROR);
});

test("contact agent phone normalization trims repeated whitespace", () => {
  assert.equal(normalizeContactAgentPhone("  +91   98765   43210  "), "+91 98765 43210");
});

test("contact agent form validates phone before sending message context", () => {
  const source = readFileSync(
    resolve(root, "src/components/dashboard/PropertyContactInfo.tsx"),
    "utf8",
  );

  assert.match(source, /validateContactAgentPhone\(contactForm\.phone\)/);
  assert.match(source, /senderPhone: normalizedPhone/);
  assert.match(source, /aria-invalid=\{Boolean\(contactErrors\.phone\)\}/);
});
