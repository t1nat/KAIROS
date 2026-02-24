/**
 * Server-side AES-256-GCM encryption for note content.
 *
 * When a user sets a password on a note, the plaintext content is
 * encrypted with a key derived from the password (PBKDF2) before
 * being written to the database. Decryption requires the original
 * password.
 *
 * Format of the stored ciphertext (base64-encoded):
 *   <16-byte IV> + <12-byte auth tag> + <ciphertext>
 */
import crypto from "node:crypto";

const ALGORITHM = "aes-256-gcm";
const IV_LENGTH = 16;
const TAG_LENGTH = 16;
const KEY_LENGTH = 32; // 256 bits
const PBKDF2_ITERATIONS = 100_000;

/**
 * Derive a 256-bit encryption key from a password + salt using PBKDF2.
 */
function deriveKey(password: string, salt: string): Buffer {
  return crypto.pbkdf2Sync(
    password,
    salt,
    PBKDF2_ITERATIONS,
    KEY_LENGTH,
    "sha512",
  );
}

/**
 * Encrypt plaintext content with a password-derived key.
 * Returns a base64-encoded string containing IV + auth tag + ciphertext.
 */
export function encryptContent(
  plaintext: string,
  password: string,
  salt: string,
): string {
  const key = deriveKey(password, salt);
  const iv = crypto.randomBytes(IV_LENGTH);

  const cipher = crypto.createCipheriv(ALGORITHM, key, iv);
  const encrypted = Buffer.concat([
    cipher.update(plaintext, "utf8"),
    cipher.final(),
  ]);
  const tag = cipher.getAuthTag();

  // Pack as: IV (16) + Tag (16) + Ciphertext (variable)
  const packed = Buffer.concat([iv, tag, encrypted]);
  return packed.toString("base64");
}

/**
 * Decrypt content that was encrypted with `encryptContent`.
 * Throws if the password is wrong (auth tag mismatch).
 */
export function decryptContent(
  cipherBase64: string,
  password: string,
  salt: string,
): string {
  const key = deriveKey(password, salt);
  const packed = Buffer.from(cipherBase64, "base64");

  const iv = packed.subarray(0, IV_LENGTH);
  const tag = packed.subarray(IV_LENGTH, IV_LENGTH + TAG_LENGTH);
  const ciphertext = packed.subarray(IV_LENGTH + TAG_LENGTH);

  const decipher = crypto.createDecipheriv(ALGORITHM, key, iv);
  decipher.setAuthTag(tag);

  const decrypted = Buffer.concat([
    decipher.update(ciphertext),
    decipher.final(),
  ]);
  return decrypted.toString("utf8");
}
