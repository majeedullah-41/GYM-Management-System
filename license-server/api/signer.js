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

function buildEnvelope(payload) {
  const canonical = canonicalPayload(payload);
  const signatureHex = signCanonicalPayload(
    canonical,
    process.env.LICENSE_PRIVATE_KEY
  );

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

  return {
    format: "GYMLIC",
    version: 1,
    key_id: "dev",
    payload_json: payloadJson,
    signature_hex: signatureHex,
  };
}

module.exports = {
  canonicalPayload,
  hexEncode,
  signCanonicalPayload,
  generateLicenseId,
  todayISO,
  buildEnvelope,
};
