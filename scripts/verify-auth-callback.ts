import assert from "node:assert/strict";

import {
  getAuthCallbackErrorMessage,
  isSignupCallback,
  resolveAuthCallbackDestination,
} from "../src/lib/auth/callbackRouting";

assert.equal(
  resolveAuthCallbackDestination({ flow: "maker-signup", type: "signup", next: null }),
  "/dashboard",
);
assert.equal(
  resolveAuthCallbackDestination({ flow: null, type: "recovery", next: "/login" }),
  "/reset-password?next=%2Flogin",
);
assert.equal(
  resolveAuthCallbackDestination({ flow: null, type: "recovery", next: "//evil.example" }),
  "/reset-password?next=%2Flogin",
);
assert.equal(isSignupCallback({ flow: "maker-signup", type: null }), true);
assert.equal(isSignupCallback({ flow: null, type: "signup" }), true);
assert.equal(isSignupCallback({ flow: "recovery", type: "recovery" }), false);
assert.match(getAuthCallbackErrorMessage("otp_expired", null), /有効期限/);
assert.match(getAuthCallbackErrorMessage("invalid_token", null), /無効/);
assert.match(getAuthCallbackErrorMessage(null, "unexpected failure"), /認証できませんでした/);

console.log("Auth callback verification PASS");
