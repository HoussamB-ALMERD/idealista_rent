import { createCipheriv, createDecipheriv, createHash, randomBytes } from "crypto";

// Bot tokens grant full control of a Telegram bot, so we encrypt them at rest.
// ENCRYPTION_KEY must be a 32-byte value, hex-encoded (64 hex chars).
// Generate one with: node -e "console.log(require('crypto').randomBytes(32).toString('hex'))"

const ALGO = "aes-256-gcm";

function getKey(): Buffer {
  const hex = process.env.ENCRYPTION_KEY;
  if (!hex) throw new Error("ENCRYPTION_KEY is not set");
  const key = Buffer.from(hex, "hex");
  if (key.length !== 32) {
    throw new Error("ENCRYPTION_KEY must be 32 bytes (64 hex characters)");
  }
  return key;
}

// Stored format: "<ivHex>:<authTagHex>:<ciphertextHex>"
export function encrypt(plaintext: string): string {
  const key = getKey();
  const iv = randomBytes(12);
  const cipher = createCipheriv(ALGO, key, iv);
  const ciphertext = Buffer.concat([cipher.update(plaintext, "utf8"), cipher.final()]);
  const authTag = cipher.getAuthTag();
  return `${iv.toString("hex")}:${authTag.toString("hex")}:${ciphertext.toString("hex")}`;
}

export function decrypt(stored: string): string {
  const key = getKey();
  const [ivHex, authTagHex, ciphertextHex] = stored.split(":");
  if (!ivHex || !authTagHex || !ciphertextHex) {
    throw new Error("Malformed encrypted value");
  }
  const decipher = createDecipheriv(ALGO, key, Buffer.from(ivHex, "hex"));
  decipher.setAuthTag(Buffer.from(authTagHex, "hex"));
  const plaintext = Buffer.concat([
    decipher.update(Buffer.from(ciphertextHex, "hex")),
    decipher.final(),
  ]);
  return plaintext.toString("utf8");
}

// Deterministic, non-reversible lookup key for a plaintext token — used for the
// unique constraint / upsert-on-conflict instead of the (randomized) ciphertext.
export function hashToken(plaintext: string): string {
  return createHash("sha256").update(plaintext, "utf8").digest("hex");
}
