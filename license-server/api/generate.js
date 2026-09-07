const { generateLicenseId, todayISO, buildEnvelope } = require("./signer");

const HEX64 = /^[0-9a-f]{64}$/i;
const DATE = /^\d{4}-\d{2}-\d{2}$/;

module.exports = async function handler(req, res) {
  if (req.method !== "POST") {
    return res.status(405).json({ error: "Method not allowed" });
  }

  const { token, hwid, customer_name, gym_name, license_type, expires_at } =
    req.body || {};

  if (!token || token !== process.env.LICENSE_ACCESS_TOKEN) {
    return res.status(401).json({ error: "Invalid or missing token" });
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

    const envelopeJson = JSON.stringify(envelope, null, 2);

    res.setHeader("Content-Type", "application/json");
    return res.status(200).json({
      ok: true,
      license_id: payload.license_id,
      customer_name: payload.customer_name,
      gym_name: payload.gym_name,
      license_type: payload.license_type,
      issued_at: payload.issued_at,
      expires_at: payload.expires_at,
      envelope: envelopeJson,
    });
  } catch (err) {
    console.error("Signing error:", err);
    return res.status(500).json({ error: "Internal signing error" });
  }
};
