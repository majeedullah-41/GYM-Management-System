const fs = require("fs");
const path = require("path");
const crypto = require("crypto");
const { generateLicenseId, todayISO, buildEnvelope, buildLicenseFile } = require("./signer");

// Automatically load .env or .env.local if present locally
try {
  const envLocal = path.resolve(__dirname, "../.env.local");
  const envDefault = path.resolve(__dirname, "../.env");
  if (typeof process.loadEnvFile === "function") {
    if (fs.existsSync(envLocal)) {
      process.loadEnvFile(envLocal);
    } else if (fs.existsSync(envDefault)) {
      process.loadEnvFile(envDefault);
    }
  }
} catch (_) {}

const HEX64 = /^[0-9a-f]{64}$/i;
const DATE = /^\d{4}-\d{2}-\d{2}$/;

module.exports = async function handler(req, res) {
  if (req.method !== "POST") {
    return res.status(405).json({ error: "Method not allowed" });
  }

  const { token, hwid, customer_name, gym_name, license_type, expires_at } =
    req.body || {};

  const expected = (process.env.LICENSE_VENDOR_KEY || process.env.LICENSE_ACCESS_TOKEN || "").trim();
  if (!expected) {
    return res
      .status(500)
      .json({ error: "Vendor key is not configured on the server" });
  }
  if (!token || !token.trim()) {
    return res.status(401).json({ error: "Vendor secret key is required" });
  }
  const provided = Buffer.from(token.trim(), "utf8");
  const configured = Buffer.from(expected, "utf8");
  if (
    provided.length !== configured.length ||
    !crypto.timingSafeEqual(provided, configured)
  ) {
    return res.status(401).json({ error: "Invalid vendor secret key" });
  }

  if (!hwid || !HEX64.test(hwid)) {
    return res
      .status(400)
      .json({ error: "hwid must be exactly 64 hex characters" });
  }

  if (!gym_name || typeof gym_name !== "string" || !gym_name.trim()) {
    return res.status(400).json({ error: "gym_name is required" });
  }

  const type = license_type || "permanent";
  if (type !== "permanent" && type !== "expiring") {
    return res
      .status(400)
      .json({ error: "license_type must be 'permanent' or 'expiring'" });
  }

  if (type === "expiring") {
    if (!expires_at || !DATE.test(expires_at)) {
      return res
        .status(400)
        .json({ error: "expires_at is required for expiring licenses (YYYY-MM-DD)" });
    }
    if (expires_at < todayISO()) {
      return res
        .status(400)
        .json({ error: "expires_at must not be in the past" });
    }
  }

  const payload = {
    version: 1,
    license_id: generateLicenseId(),
    customer_name: (customer_name || "").trim(),
    gym_name: gym_name.trim(),
    hwid: hwid.toLowerCase(),
    license_type: type,
    issued_at: todayISO(),
    expires_at: type === "expiring" ? expires_at : null,
  };

  try {
    const envelope = buildEnvelope(payload);
    const licenseFileContent = buildLicenseFile(envelope);

    const slug = (gym_name.trim() || "license")
      .toLowerCase()
      .replace(/[^a-z0-9]+/g, "-")
      .replace(/^-|-$/g, "");
    const filename = `${slug || "license"}.gymlic`;

    res.setHeader("Content-Type", "application/json");
    return res.status(200).json({
      ok: true,
      license_id: payload.license_id,
      customer_name: payload.customer_name,
      gym_name: payload.gym_name,
      license_type: payload.license_type,
      issued_at: payload.issued_at,
      expires_at: payload.expires_at,
      filename: filename,
      license_file: licenseFileContent,
    });
  } catch (err) {
    console.error("Signing error:", err);
    if (err.message === "seed must be 32 bytes") {
      return res.status(500).json({
        error:
          "Signing misconfigured: LICENSE_PRIVATE_KEY is missing, invalid, or has whitespace",
      });
    }
    return res.status(500).json({ error: "Internal signing error" });
  }
};
