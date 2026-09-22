const test = require("node:test");
const assert = require("node:assert");
const handler = require("../api/generate");

function callHandler(req) {
  let captured = null;
  const res = {
    setHeader: () => {},
    status: (code) => ({ json: (body) => (captured = { code, body }) }),
  };
  return handler({ ...req }, res).then(() => captured);
}

test("rejects requests when vendor secret key is missing", async () => {
  process.env.LICENSE_VENDOR_KEY = "my-vendor-secret";
  try {
    const result = await callHandler({
      method: "POST",
      body: {
        hwid: "547612b968aadb7316ab1079e628da594c4352a4815f758396af72d7fd205f77",
        gym_name: "Swat",
        license_type: "permanent",
      },
    });
    assert.strictEqual(result.code, 401);
    assert.match(result.body.error, /Vendor secret key is required/i);
  } finally {
    delete process.env.LICENSE_VENDOR_KEY;
  }
});

test("returns 500 when no vendor key is configured", async () => {
  delete process.env.LICENSE_VENDOR_KEY;
  delete process.env.LICENSE_ACCESS_TOKEN;
  delete process.env.LICENSE_PRIVATE_KEY;
  const result = await callHandler({
    method: "POST",
    body: {
      token: "any-token",
      hwid: "547612b968aadb7316ab1079e628da594c4352a4815f758396af72d7fd205f77",
      gym_name: "Swat",
      license_type: "permanent",
    },
  });
  assert.strictEqual(result.code, 500);
  assert.match(result.body.error, /not configured/i);
});

test("allows requests with valid vendor key and returns v2 filename and license_file", async () => {
  process.env.LICENSE_VENDOR_KEY = "my-vendor-secret";
  process.env.LICENSE_PRIVATE_KEY = Buffer.alloc(32).toString("base64");
  try {
    const result = await callHandler({
      method: "POST",
      body: {
        token: "my-vendor-secret",
        hwid: "547612b968aadb7316ab1079e628da594c4352a4815f758396af72d7fd205f77",
        gym_name: "Swat Fitness",
        license_type: "permanent",
      },
    });
    assert.strictEqual(result.code, 200);
    assert.strictEqual(result.body.ok, true);
    assert.strictEqual(result.body.filename, "swat-fitness.gymlic");
    assert.ok(result.body.license_file.startsWith("GYMLIC2."));
  } finally {
    delete process.env.LICENSE_VENDOR_KEY;
    delete process.env.LICENSE_PRIVATE_KEY;
  }
});

test("rejects requests when vendor key is incorrect", async () => {
  process.env.LICENSE_VENDOR_KEY = "correct-secret";
  const result = await callHandler({
    method: "POST",
    body: { token: "wrong-secret" },
  });
  assert.strictEqual(result.code, 401);
  assert.match(result.body.error, /Invalid vendor secret key/i);
  delete process.env.LICENSE_VENDOR_KEY;
});

test("returns a clear error when LICENSE_PRIVATE_KEY is missing", async () => {
  process.env.LICENSE_VENDOR_KEY = "secret";
  delete process.env.LICENSE_PRIVATE_KEY;
  try {
    const result = await callHandler({
      method: "POST",
      body: {
        token: "secret",
        hwid: "547612b968aadb7316ab1079e628da594c4352a4815f758396af72d7fd205f77",
        gym_name: "Swat",
        license_type: "permanent",
      },
    });
    assert.strictEqual(result.code, 500);
    assert.match(result.body.error, /LICENSE_PRIVATE_KEY/);
  } finally {
    delete process.env.LICENSE_VENDOR_KEY;
  }
});