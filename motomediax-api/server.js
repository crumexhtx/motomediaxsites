/**
 * MotoMediaX API — vehicle catalog (makes → models → years, specs sourced
 * from NHTSA/EPA/Wikipedia) plus NHTSA recall and owner-complaint data.
 */
"use strict";

const fs = require("node:fs");
const path = require("node:path");
const express = require("express");

const CATALOG_PATH = path.join(__dirname, "data", "catalog.json");
const RECALLS_PATH = path.join(__dirname, "data", "recalls-complaints.json");

function loadJson(filePath, fallback) {
  if (!fs.existsSync(filePath)) return fallback;
  return JSON.parse(fs.readFileSync(filePath, "utf8"));
}

const catalog = loadJson(CATALOG_PATH, []);
const recallsByKey = loadJson(RECALLS_PATH, {});

/** slug -> make, for O(1) lookups. */
const makeIndex = new Map(catalog.map((make) => [make.slug, make]));

function getMake(makeSlug) {
  return makeIndex.get(String(makeSlug ?? "").toLowerCase());
}

function getModel(makeSlug, modelSlug) {
  const make = getMake(makeSlug);
  if (!make) return undefined;
  const key = String(modelSlug ?? "").toLowerCase();
  const model = make.models.find((m) => m.slug === key);
  if (!model) return undefined;
  return { make, model };
}

function getYear(makeSlug, modelSlug, yearParam) {
  const found = getModel(makeSlug, modelSlug);
  if (!found) return undefined;
  const yearNum = Number.parseInt(yearParam, 10);
  const year = found.model.years.find((y) => y.year === yearNum);
  if (!year) return undefined;
  return { ...found, year };
}

function recallKey(makeSlug, modelSlug, year) {
  return `${makeSlug}/${modelSlug}/${year}`;
}

/** Recall data for a vehicle, or an explicit "never fetched" record. */
function getRecallRecord(makeSlug, modelSlug, year) {
  const key = recallKey(makeSlug.toLowerCase(), modelSlug.toLowerCase(), year);
  return (
    recallsByKey[key] ?? {
      recalls: [],
      recallDataAvailable: false,
      recallsError: "not yet fetched",
      complaints: null,
      complaintDataAvailable: false,
      complaintsError: "not yet fetched",
      fetchedAt: null,
      source: null,
    }
  );
}

/** Compact signal for the main detail endpoint — full breakdown lives at /recalls. */
function recallSummaryOf(record) {
  const topComponent = record.complaints?.byComponent?.[0]?.component ?? null;
  return {
    totalRecalls: record.recallDataAvailable ? record.recalls.length : null,
    totalComplaints: record.complaintDataAvailable ? record.complaints.total : null,
    mostComplainedCategory: record.complaintDataAvailable ? topComponent : null,
    recallDataAvailable: record.recallDataAvailable,
    complaintDataAvailable: record.complaintDataAvailable,
  };
}

const app = express();
app.disable("x-powered-by");

app.get("/v1/health", (req, res) => {
  res.json({
    ok: true,
    makes: catalog.length,
    vehiclesWithSafetyData: Object.keys(recallsByKey).length,
  });
});

app.get("/v1/makes", (req, res) => {
  res.json({
    makes: catalog.map((make) => ({
      slug: make.slug,
      name: make.name,
      country: make.country,
      modelCount: make.models.length,
    })),
  });
});

app.get("/v1/makes/:makeSlug", (req, res) => {
  const make = getMake(req.params.makeSlug);
  if (!make) return res.status(404).json({ error: "make not found" });
  res.json({
    slug: make.slug,
    name: make.name,
    country: make.country,
    blurb: make.blurb,
    models: make.models.map((model) => ({
      slug: model.slug,
      name: model.name,
      tagline: model.tagline,
      years: model.years.map((y) => y.year).sort((a, b) => b - a),
    })),
  });
});

app.get("/v1/makes/:makeSlug/models/:modelSlug", (req, res) => {
  const found = getModel(req.params.makeSlug, req.params.modelSlug);
  if (!found) return res.status(404).json({ error: "model not found" });
  const { make, model } = found;
  res.json({
    make: { slug: make.slug, name: make.name },
    slug: model.slug,
    name: model.name,
    tagline: model.tagline,
    years: [...model.years]
      .sort((a, b) => b.year - a.year)
      .map((year) => ({ year: year.year, slug: year.slug, summary: year.summary })),
  });
});

app.get("/v1/makes/:makeSlug/models/:modelSlug/years/:year", (req, res) => {
  const found = getYear(req.params.makeSlug, req.params.modelSlug, req.params.year);
  if (!found) return res.status(404).json({ error: "year not found" });
  const { make, model, year } = found;
  const record = getRecallRecord(make.slug, model.slug, year.year);

  res.json({
    make: { slug: make.slug, name: make.name, country: make.country },
    model: { slug: model.slug, name: model.name, tagline: model.tagline },
    year: year.year,
    slug: year.slug,
    summary: year.summary,
    description: year.description,
    highlights: year.highlights ?? [],
    specs: year.specs ?? null,
    performance: year.performance ?? null,
    sources: year.sources ?? null,
    recallSummary: recallSummaryOf(record),
  });
});

app.get(
  "/v1/makes/:makeSlug/models/:modelSlug/years/:year/recalls",
  (req, res) => {
    const found = getYear(req.params.makeSlug, req.params.modelSlug, req.params.year);
    if (!found) return res.status(404).json({ error: "year not found" });
    const { make, model, year } = found;
    const record = getRecallRecord(make.slug, model.slug, year.year);

    res.json({
      make: { slug: make.slug, name: make.name },
      model: { slug: model.slug, name: model.name },
      year: year.year,
      recalls: record.recalls,
      recallDataAvailable: record.recallDataAvailable,
      recallsError: record.recallsError,
      complaints: record.complaints,
      complaintDataAvailable: record.complaintDataAvailable,
      complaintsError: record.complaintsError,
      fetchedAt: record.fetchedAt,
    });
  },
);

app.use((req, res) => {
  res.status(404).json({ error: "not found" });
});

if (require.main === module) {
  const port = Number(process.env.PORT) || 3001;
  app.listen(port, () => {
    console.log(`motomediax-api listening on http://localhost:${port}`);
  });
}

module.exports = app;
