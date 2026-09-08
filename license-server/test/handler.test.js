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

test("allows requests without a token when LICENSE_ACCESS_TOKEN is unset", async () => {
  delete process.env.LICENSE_ACCESS_TOKEN;
  const result = await callHandler({
    method: "POST",
    body: {
      hwid: "547612b968aadb7316ab1079e628da594c4352a4815f758396af72d7fd205f77",
      gym_name: "Swat",
      license_type: "permanent",
    },
  });
  assert.strictEqual(result.code, 200);
  assert.strictEqual(result.body.ok, true);
});

test("rejects requests when a token IS configured but missing", async () => {
  process.env.LICENSE_ACCESS_TOKEN = "secret";
  const result = await callHandler({ method: "POST", body: {} });
  assert.strictEqual(result.code, 401);
  delete process.env.LICENSE_ACCESS_TOKEN;
});

test("returns a clear error when LICENSE_PRIVATE_KEY is missing", async () => {
  delete process.env.LICENSE_PRIVATE_KEY;
  const result = await callHandler({
    method: "POST",
    body: {
      hwid: "547612b968aadb7316ab1079e628da594c4352a4815f758396af72d7fd205f77",
      gym_name: "Swat",
      license_type: "permanent",
    },
  });
  assert.strictEqual(result.code, 500);
  assert.match(result.body.error, /LICENSE_PRIVATE_KEY/);
});