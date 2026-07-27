"use strict";

const { test, before, after, beforeEach } = require("node:test");
const assert = require("node:assert/strict");
const http = require("node:http");
const {
  fetchJson,
  parseDate,
  normalizeComponent,
} = require("../scripts/enrich-recalls-complaints.js");

// Small pacing/backoff in tests so the suite stays fast; the retry *shape*
// (attempt count, when it gives up) is what's under test, not real timings.
const DELAY_MS = 5;

let server;
let baseUrl;
let requestCount;
/** Set by each test: how the mock NHTSA endpoint should behave per request. */
let behavior;

before(() => {
  server = http.createServer((req, res) => {
    requestCount += 1;
    const step = behavior(requestCount);
    if (step.status !== 200) {
      res.writeHead(step.status);
      res.end(step.body ?? "");
      return;
    }
    res.writeHead(200, { "content-type": "application/json" });
    res.end(JSON.stringify(step.body ?? { results: [] }));
  });
  server.listen(0);
  const { port } = server.address();
  baseUrl = `http://127.0.0.1:${port}`;
});

after(() => {
  server.close();
});

beforeEach(() => {
  requestCount = 0;
});

test("fetchJson succeeds immediately when the first attempt is a 400 that then recovers by retry 2/3", async () => {
  // Mirrors what's reported live: intermittent HTTP 400 unrelated to the
  // request itself, not consistent across retries.
  behavior = (n) => (n < 2 ? { status: 400 } : { status: 200, body: { results: [] } });
  const res = await fetchJson(baseUrl, DELAY_MS, 3);
  assert.equal(res.ok, true);
  assert.equal(res.attempts, 2);
  assert.equal(requestCount, 2);
});

test("fetchJson retries up to maxAttempts and only then reports failure — never silently treats it as success", async () => {
  behavior = () => ({ status: 400 });
  const res = await fetchJson(baseUrl, DELAY_MS, 3);
  assert.equal(res.ok, false);
  assert.equal(res.attempts, 3);
  assert.equal(requestCount, 3, "should attempt exactly maxAttempts times, no more, no less");
  assert.match(res.error, /HTTP 400/);
});

test("fetchJson calls onRetry for every failed attempt except the last", async () => {
  behavior = () => ({ status: 400 });
  const retries = [];
  await fetchJson(baseUrl, DELAY_MS, 3, (attempt, maxAttempts, error) => {
    retries.push({ attempt, maxAttempts, error });
  });
  assert.equal(retries.length, 2, "2 retries logged for a 3-attempt failure (not a retry after the final attempt)");
  assert.equal(retries[0].attempt, 1);
  assert.equal(retries[1].attempt, 2);
});

test("fetchJson with maxAttempts=1 does not retry at all", async () => {
  behavior = () => ({ status: 400 });
  const res = await fetchJson(baseUrl, DELAY_MS, 1);
  assert.equal(res.ok, false);
  assert.equal(requestCount, 1);
});

test("parseDate converts NHTSA's MM/DD/YYYY to ISO YYYY-MM-DD, including days > 12", async () => {
  // Day 30 makes the DD/MM misparse this API replaced impossible to hide —
  // a day > 12 can never be mistaken for a valid month.
  assert.equal(parseDate("06/30/2026"), "2026-06-30");
  assert.equal(parseDate("01/05/2024"), "2024-01-05");
});

test("parseDate passes through already-ISO dates unchanged", async () => {
  assert.equal(parseDate("2026-06-30"), "2026-06-30");
});

test("normalizeComponent title-cases and takes the first tag of a multi-value field", async () => {
  assert.equal(normalizeComponent("ELECTRICAL SYSTEM"), "Electrical System");
  assert.equal(normalizeComponent("STEERING, SUSPENSION"), "Steering");
  assert.equal(normalizeComponent(""), "Unspecified");
});
