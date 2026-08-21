import assert from "node:assert/strict";

import {
  decryptAccessCode,
  encryptAccessCode,
  generateAccessCode,
  hashAccessCode,
  verifyAccessCodeHash,
} from "../src/lib/server/accessCodeCore";

process.env.PURCHASE_CODE_PEPPER = "gatec-test-pepper";
process.env.PURCHASE_CODE_ENCRYPTION_KEY = "0123456789abcdef0123456789abcdef0123456789abcdef0123456789abcdef";

const generated = Array.from({ length: 1000 }, () => generateAccessCode());
assert.equal(new Set(generated).size, generated.length, "access codes must be unique in the sample");
for (const code of generated) {
  assert.match(code, /^WBK-[23456789ABCDEFGHJKMNPQRSTUVWXYZ]{4}(?:-[23456789ABCDEFGHJKMNPQRSTUVWXYZ]{4}){3}$/);
  assert.doesNotMatch(code, /[01ILO]/u);
}

const sample = generated[0]!;
const hash = hashAccessCode(sample);
assert.equal(verifyAccessCodeHash(sample, hash), true, "same code must verify");
assert.equal(verifyAccessCodeHash(generateAccessCode(), hash), false, "different code must not verify");

const ciphertext = encryptAccessCode(sample);
assert.equal(ciphertext.includes(sample), false, "ciphertext must not expose the plain code");
assert.equal(decryptAccessCode(ciphertext), sample, "encrypted code must round-trip");

console.log("Gate C access-code utility checks passed.");
