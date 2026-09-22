const crypto = require("crypto");

const SEPARATOR = "\x1e";

function canonicalPayload(p) {
  const parts = [
    String(p.version),
    p.license_id,
    p.customer_name,
    p.gym_name,
    p.hwid,
    p.license_type,
    p.issued_at,
    p.expires_at || "",
  ];
  const text = parts.join(SEPARATOR);
  return Buffer.from(text, "utf8");
}

function hexEncode(buf) {
  return Array.from(buf)
    .map((b) => b.toString(16).padStart(2, "0"))
    .join("");
}

function signCanonicalPayload(canonicalBytes, seedBase64) {
  const seed = Buffer.from(seedBase64, "base64");
  if (seed.length !== 32) throw new Error("seed must be 32 bytes");

  const header = Buffer.from(
    "302e020100300506032b657004220420",
    "hex"
  );
  const pkcs8 = Buffer.concat([header, seed]);
  const privateKey = crypto.createPrivateKey({
    key: pkcs8,
    format: "der",
    type: "pkcs8",
  });
  const sig = crypto.sign(null, canonicalBytes, privateKey);
  return hexEncode(sig);
}

function generateLicenseId() {
  const now = new Date();
  const year = now.getFullYear();
  const chars = "0123456789ABCDEF";
  let suffix = "";
  for (let i = 0; i < 6; i++) {
    suffix += chars[Math.floor(Math.random() * 16)];
  }
  return `LIC-${year}-${suffix}`;
}

function todayISO() {
  const now = new Date();
  const y = now.getFullYear();
  const m = String(now.getMonth() + 1).padStart(2, "0");
  const d = String(now.getDate()).padStart(2, "0");
  return `${y}-${m}-${d}`;
}

const ENCRYPTION_SECRET = "gympos_license_v2_payload_encryption_key_2026";

function getEncryptionKey() {
  return crypto.createHash("sha256").update(ENCRYPTION_SECRET).digest();
}

function encryptPayload(payloadJson, iv) {
  const key = getEncryptionKey();
  const cipher = crypto.createCipheriv("aes-256-gcm", key, iv);
  const encrypted = Buffer.concat([cipher.update(payloadJson, "utf8"), cipher.final()]);
  const tag = cipher.getAuthTag();
  return Buffer.concat([encrypted, tag]);
}

function decryptPayload(ciphertextAndTag, iv) {
  const key = getEncryptionKey();
  const tag = ciphertextAndTag.subarray(ciphertextAndTag.length - 16);
  const ct = ciphertextAndTag.subarray(0, ciphertextAndTag.length - 16);
  const decipher = crypto.createDecipheriv("aes-256-gcm", key, iv);
  decipher.setAuthTag(tag);
  return Buffer.concat([decipher.update(ct), decipher.final()]).toString("utf8");
}

function buildEnvelope(payload, customIv) {
  const seedBase64 = (process.env.LICENSE_PRIVATE_KEY || "").trim();
  if (!seedBase64) throw new Error("seed must be 32 bytes");
  const canonical = canonicalPayload(payload);
  const signatureHex = signCanonicalPayload(canonical, seedBase64);

  const payloadJson = JSON.stringify({
    version: payload.version,
    license_id: payload.license_id,
    customer_name: payload.customer_name,
    gym_name: payload.gym_name,
    hwid: payload.hwid,
    license_type: payload.license_type,
    issued_at: payload.issued_at,
    expires_at: payload.expires_at,
  });

  const iv = customIv || crypto.randomBytes(12);
  const encryptedBytes = encryptPayload(payloadJson, iv);

  return {
    format: "GYMLIC",
    version: 2,
    key_id: "dev",
    iv: hexEncode(iv),
    ciphertext: hexEncode(encryptedBytes),
    signature_hex: signatureHex,
  };
}

function buildLicenseFile(envelope) {
  const jsonStr = JSON.stringify(envelope);
  const b64 = Buffer.from(jsonStr, "utf8").toString("base64");
  return `GYMLIC2.${b64}`;
}

module.exports = {
  canonicalPayload,
  hexEncode,
  signCanonicalPayload,
  generateLicenseId,
  todayISO,
  getEncryptionKey,
  encryptPayload,
  decryptPayload,
  buildEnvelope,
  buildLicenseFile,
  ENCRYPTION_SECRET,
};
