import {
  createCipheriv,
  createDecipheriv,
  createHmac,
  randomBytes,
  randomInt,
  timingSafeEqual,
} from "node:crypto";

const ACCESS_CODE_PREFIX = "WBK";
const ACCESS_CODE_GROUP_LENGTH = 4;
const ACCESS_CODE_GROUPS = 4;
const ACCESS_CODE_ALPHABET = "23456789ABCDEFGHJKMNPQRSTUVWXYZ";
const ENCRYPTION_VERSION = "v1";

function normalizeAccessCode(code: string): string {
  return code.replace(/[\s-]/gu, "").toUpperCase();
}

function requirePepper(): Buffer {
  const pepper = process.env.PURCHASE_CODE_PEPPER?.trim();
  if (!pepper) throw new Error("Purchase code server configuration is unavailable.");
  return Buffer.from(pepper, "utf8");
}

function requireEncryptionKey(): Buffer {
  const raw = process.env.PURCHASE_CODE_ENCRYPTION_KEY?.trim();
  if (!raw) throw new Error("Purchase code encryption configuration is unavailable.");
  if (/^[0-9a-f]{64}$/iu.test(raw)) return Buffer.from(raw, "hex");

  const base64 = Buffer.from(raw, "base64");
  if (base64.length === 32 && base64.toString("base64").replace(/=+$/u, "") === raw.replace(/=+$/u, "")) {
    return base64;
  }
  throw new Error("Purchase code encryption key must be a 32-byte hex or base64 value.");
}

export function generateAccessCode(): string {
  const groups = Array.from({ length: ACCESS_CODE_GROUPS }, () => {
    let group = "";
    for (let index = 0; index < ACCESS_CODE_GROUP_LENGTH; index += 1) {
      group += ACCESS_CODE_ALPHABET[randomInt(ACCESS_CODE_ALPHABET.length)];
    }
    return group;
  });
  return `${ACCESS_CODE_PREFIX}-${groups.join("-")}`;
}

export function hashAccessCode(code: string): string {
  return createHmac("sha256", requirePepper()).update(normalizeAccessCode(code), "utf8").digest("hex");
}

export function verifyAccessCodeHash(code: string, expectedHash: string): boolean {
  const actual = Buffer.from(hashAccessCode(code), "hex");
  const expected = Buffer.from(expectedHash, "hex");
  return actual.length === expected.length && timingSafeEqual(actual, expected);
}

export function encryptAccessCode(code: string): string {
  const iv = randomBytes(12);
  const cipher = createCipheriv("aes-256-gcm", requireEncryptionKey(), iv);
  const encrypted = Buffer.concat([cipher.update(code, "utf8"), cipher.final()]);
  const authTag = cipher.getAuthTag();
  return [ENCRYPTION_VERSION, iv.toString("base64url"), authTag.toString("base64url"), encrypted.toString("base64url")].join(":");
}

export function decryptAccessCode(ciphertext: string): string {
  const [version, ivValue, authTagValue, encryptedValue] = ciphertext.split(":");
  if (version !== ENCRYPTION_VERSION || !ivValue || !authTagValue || !encryptedValue) {
    throw new Error("Invalid purchase code ciphertext.");
  }

  const decipher = createDecipheriv("aes-256-gcm", requireEncryptionKey(), Buffer.from(ivValue, "base64url"));
  decipher.setAuthTag(Buffer.from(authTagValue, "base64url"));
  return Buffer.concat([
    decipher.update(Buffer.from(encryptedValue, "base64url")),
    decipher.final(),
  ]).toString("utf8");
}

export const ACCESS_CODE_FORMAT = "WBK-XXXX-XXXX-XXXX-XXXX";
