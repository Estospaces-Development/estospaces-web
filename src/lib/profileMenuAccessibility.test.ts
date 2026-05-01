import test from "node:test";
import assert from "node:assert/strict";

import { getProfileLinkLabel, getProfileMenuControlLabel } from "./profileMenuAccessibility";

test("profile menu controls announce action, user, and role", () => {
  assert.equal(
    getProfileMenuControlLabel({ displayName: "Test User", role: "user", isOpen: false }),
    "Open profile menu for Test User, user account",
  );
  assert.equal(
    getProfileMenuControlLabel({ displayName: "Sample Admin", role: "admin", isOpen: true }),
    "Close profile menu for Sample Admin, admin account",
  );
});

test("profile links do not rely on avatar initials as their accessible name", () => {
  assert.equal(
    getProfileLinkLabel({ displayName: "Super Admin", role: "admin" }),
    "Open profile for Super Admin, admin account",
  );
  assert.equal(
    getProfileMenuControlLabel({ displayName: "   ", role: "manager", isOpen: false }),
    "Open profile menu for your profile, manager account",
  );
});
