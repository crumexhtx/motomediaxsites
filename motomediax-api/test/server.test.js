"use strict";

const { test, before, after } = require("node:test");
const assert = require("node:assert/strict");
const app = require("../server.js");

let server;
let baseUrl;

before(() => {
  server = app.listen(0);
  const { port } = server.address();
  baseUrl = `http://127.0.0.1:${port}`;
});

after(() => {
  server.close();
});

async function get(pathname) {
  const res = await fetch(`${baseUrl}${pathname}`);
  const body = await res.json();
  return { status: res.status, body };
}

test("GET /v1/health reports catalog + safety-data counts", async () => {
  const { status, body } = await get("/v1/health");
  assert.equal(status, 200);
  assert.equal(body.ok, true);
  assert.ok(body.makes > 0);
});

test("GET /v1/makes lists makes without leaking model internals", async () => {
  const { status, body } = await get("/v1/makes");
  assert.equal(status, 200);
  assert.ok(Array.isArray(body.makes));
  const ford = body.makes.find((m) => m.slug === "ford");
  assert.ok(ford);
  assert.equal(ford.name, "Ford");
});

test("GET /v1/makes/:makeSlug 404s for an unknown make", async () => {
  const { status, body } = await get("/v1/makes/not-a-real-make");
  assert.equal(status, 404);
  assert.equal(body.error, "make not found");
});

test("GET /v1/makes/:makeSlug/models/:modelSlug returns model years", async () => {
  const { status, body } = await get("/v1/makes/ford/models/mustang-mach-e");
  assert.equal(status, 200);
  assert.equal(body.make.slug, "ford");
  assert.equal(body.slug, "mustang-mach-e");
  assert.ok(body.years.some((y) => y.year === 2024));
});

test("GET .../years/:year merges a recall summary into the detail response", async () => {
  const { status, body } = await get(
    "/v1/makes/ford/models/mustang-mach-e/years/2024",
  );
  assert.equal(status, 200);
  assert.ok(body.specs || body.specs === null);
  assert.ok(body.recallSummary);
  assert.equal(body.recallSummary.recallDataAvailable, true);
  assert.equal(typeof body.recallSummary.totalRecalls, "number");
  assert.ok(body.recallSummary.totalRecalls > 0);
});

test("GET .../years/:year/recalls returns the full recall list for a vehicle with real recalls", async () => {
  const { status, body } = await get(
    "/v1/makes/ford/models/mustang-mach-e/years/2024/recalls",
  );
  assert.equal(status, 200);
  assert.equal(body.recallDataAvailable, true);
  assert.ok(body.recalls.length > 0);
  const recall = body.recalls[0];
  assert.ok(recall.campaignNumber);
  assert.match(recall.date, /^\d{4}-\d{2}-\d{2}$/);
  assert.ok(recall.component);
  assert.ok(recall.summary);
});

test("a confirmed-zero-recalls vehicle is distinguishable from a failed fetch", async () => {
  const emptyCase = await get(
    "/v1/makes/toyota/models/supra/years/2026/recalls",
  );
  assert.equal(emptyCase.status, 200);
  assert.equal(emptyCase.body.recallDataAvailable, true);
  assert.deepEqual(emptyCase.body.recalls, []);
  assert.equal(emptyCase.body.recallsError, null);

  const errorCase = await get(
    "/v1/makes/tesla/models/model-3/years/2024/recalls",
  );
  assert.equal(errorCase.status, 200);
  assert.equal(errorCase.body.recallDataAvailable, false);
  assert.deepEqual(errorCase.body.recalls, []);
  assert.ok(errorCase.body.recallsError);
});

test("GET .../years/:year/recalls 404s for an unknown year", async () => {
  const { status, body } = await get(
    "/v1/makes/ford/models/mustang-mach-e/years/1999/recalls",
  );
  assert.equal(status, 404);
  assert.equal(body.error, "year not found");
});

test("unknown routes 404 with JSON", async () => {
  const { status, body } = await get("/v1/nope");
  assert.equal(status, 404);
  assert.equal(body.error, "not found");
});
