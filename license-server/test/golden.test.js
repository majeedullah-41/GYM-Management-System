const test = require("node:test");
const assert = require("node:assert");
const {
  canonicalPayload,
  hexEncode,
  signCanonicalPayload,
} = require("../api/signer");

const SAMPLE = {
  version: 1,
  license_id: "LIC-2026-000124",
  customer_name: "Ali Khan",
  gym_name: "Swat Fitness Center",
  hwid: "00000000000000000000000000000007",
  license_type: "permanent",
  issued_at: "2026-09-05",
  expires_at: null,
};

const EXPECTED_CANONICAL =
  "1\x1eLIC-2026-000124\x1eAli Khan\x1eSwat Fitness Center\x1e" +
  "00000000000000000000000000000007\x1epermanent\x1e2026-09-05\x1e";

const GOLDEN_SIG =
  "278830a414cd227a607ef54a20e441be499707203891efdaf1d51c4a696e6278" +
  "4a457d066465577caed419e6678bf8348f879cc140b5e32ec3a914391f68b20a";

test("canonical payload matches the Rust serializer bit-for-bit", () => {
  const bytes = canonicalPayload(SAMPLE);
  const text = bytes.toString("utf8");
  assert.strictEqual(text, EXPECTED_CANONICAL);
});

test("Ed25519 signature matches the Rust golden vector", () => {
  const seed = Buffer.alloc(32, 9).toString("base64");
  const canonical = canonicalPayload(SAMPLE);
  const sig = signCanonicalPayload(canonical, seed);
  assert.strictEqual(sig, GOLDEN_SIG);
});

test("hexEncode produces lowercase hex", () => {
  assert.strictEqual(hexEncode(Buffer.from([0xff, 0x0a, 0x01])), "ff0a01");
});