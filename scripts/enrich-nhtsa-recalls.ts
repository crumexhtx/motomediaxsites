/**
 * Patch NHTSA recalls (+ optional complaints) into catalog.generated.json.
 *
 * Usage:
 *   pnpm enrich:nhtsa-recalls
 *   pnpm enrich:nhtsa-recalls -- --brand bmw --limit 5
 *   pnpm enrich:nhtsa-recalls -- --force --with-complaints
 *   pnpm enrich:nhtsa-recalls -- --complaints-only
 */
import fs from "node:fs";
import path from "node:path";
import { fileURLToPath } from "node:url";
import type { MakeEntry, YearEntry } from "../src/data/catalog";
import {
  fetchComplaintSummary,
  fetchRecalls,
} from "./nhtsa-safety";

const __dirname = path.dirname(fileURLToPath(import.meta.url));
const ROOT = path.resolve(__dirname, "..");
const OUT_PATH = path.join(ROOT, "src/data/catalog.generated.json");

function argFlag(name: string) {
  return process.argv.includes(name);
}

function argValue(name: string): string | undefined {
  const idx = process.argv.indexOf(name);
  return idx >= 0 ? process.argv[idx + 1] : undefined;
}

async function main() {
  if (!fs.existsSync(OUT_PATH)) {
    throw new Error(`Missing ${OUT_PATH} — run pnpm build:catalog first`);
  }

  const force = argFlag("--force");
  const withComplaints = argFlag("--with-complaints") || argFlag("--complaints-only");
  const complaintsOnly = argFlag("--complaints-only");
  const brandFilter = argValue("--brand")?.toLowerCase();
  const limit = Number(argValue("--limit") || 0) || 0;
  const dryRun = argFlag("--dry-run");

  const catalog = JSON.parse(fs.readFileSync(OUT_PATH, "utf8")) as MakeEntry[];

  let processed = 0;
  let recallOk = 0;
  let recallEmpty = 0;
  let recallErr = 0;
  let complaintOk = 0;
  let complaintEmpty = 0;
  let complaintErr = 0;
  const failures: string[] = [];

  console.log(
    `== NHTSA safety enrich (recalls${!complaintsOnly ? "" : " skipped"}${withComplaints ? " + complaints" : ""}) ==`,
  );

  outer: for (const make of catalog) {
    if (brandFilter && make.slug !== brandFilter) continue;
    for (const model of make.models) {
      for (const year of model.years) {
        if (limit && processed >= limit) break outer;
        processed += 1;
        const label = `${make.slug}/${model.slug}/${year.year}`;
        process.stdout.write(`  ${label}... `);

        const status = { ...(year.safetyStatus ?? {}) } as YearEntry["safetyStatus"] &
          object;
        // fetchedAt is the last time a dataset for this year was fetched
        // successfully — a failed run must never make stale data look fresh.
        const nextStatus = {
          recalls: status?.recalls ?? ("empty" as const),
          complaints: status?.complaints ?? ("empty" as const),
          fetchedAt: status?.fetchedAt,
          recallsError: status?.recallsError,
          complaintsError: status?.complaintsError,
        };
        const stampFetched = () => {
          nextStatus.fetchedAt = new Date().toISOString();
        };

        if (!complaintsOnly) {
          try {
            const result = await fetchRecalls(
              make.name,
              model.name,
              year.year,
              { force },
            );
            if (result.status === "error") {
              // Keep the last good recall list instead of wiping it to [].
              const hadGoodData =
                status?.recalls === "ok" || status?.recalls === "empty";
              if (!hadGoodData) {
                year.recalls = result.data;
                nextStatus.recalls = "error";
              }
              nextStatus.recallsError = hadGoodData ? undefined : result.error;
              failures.push(`${label} recalls: ${result.error}`);
              recallErr += 1;
              process.stdout.write(`recalls:ERR(${result.error}) `);
              if (hadGoodData) process.stdout.write("(kept previous) ");
            } else if (result.status === "empty") {
              year.recalls = result.data;
              nextStatus.recalls = result.status;
              stampFetched();
              delete nextStatus.recallsError;
              recallEmpty += 1;
              process.stdout.write("recalls:0 ");
            } else {
              year.recalls = result.data;
              nextStatus.recalls = result.status;
              stampFetched();
              delete nextStatus.recallsError;
              recallOk += 1;
              process.stdout.write(`recalls:${result.data.length} `);
            }
            year.sources = {
              ...year.sources,
              recalls: "https://www.nhtsa.gov/recalls",
              nhtsa: year.sources?.nhtsa ?? "https://www.nhtsa.gov/ratings",
            };
            if (result.status !== "error" && result.data.length) {
              const labelH = `${result.data.length} NHTSA recall${result.data.length === 1 ? "" : "s"}`;
              const rest = (year.highlights ?? []).filter(
                (h) => !/NHTSA recall/i.test(h),
              );
              year.highlights = [labelH, ...rest].slice(0, 8);
            }
          } catch (err) {
            const message = err instanceof Error ? err.message : String(err);
            const hadGoodData =
              status?.recalls === "ok" || status?.recalls === "empty";
            if (!hadGoodData) {
              nextStatus.recalls = "error";
              nextStatus.recallsError = message;
            }
            failures.push(`${label} recalls: ${message}`);
            recallErr += 1;
            process.stdout.write(`recalls:EX(${message}) `);
          }
        }

        if (withComplaints) {
          try {
            const result = await fetchComplaintSummary(
              make.name,
              model.name,
              year.year,
              { force },
            );
            if (result.status === "error") {
              // Keep the last good complaint summary instead of zeroing it.
              const hadGoodData =
                status?.complaints === "ok" || status?.complaints === "empty";
              if (!hadGoodData) {
                year.complaints = result.data;
                nextStatus.complaints = "error";
              }
              nextStatus.complaintsError = hadGoodData
                ? undefined
                : result.error;
              failures.push(`${label} complaints: ${result.error}`);
              complaintErr += 1;
              process.stdout.write(`complaints:ERR(${result.error}) `);
              if (hadGoodData) process.stdout.write("(kept previous) ");
            } else if (result.status === "empty") {
              year.complaints = result.data;
              nextStatus.complaints = result.status;
              stampFetched();
              delete nextStatus.complaintsError;
              complaintEmpty += 1;
              process.stdout.write("complaints:0 ");
            } else {
              year.complaints = result.data;
              nextStatus.complaints = result.status;
              stampFetched();
              delete nextStatus.complaintsError;
              complaintOk += 1;
              process.stdout.write(`complaints:${result.data.total} `);
            }
            year.sources = {
              ...year.sources,
              complaints: "https://www.nhtsa.gov/report-a-safety-problem",
            };
          } catch (err) {
            const message = err instanceof Error ? err.message : String(err);
            const hadGoodData =
              status?.complaints === "ok" || status?.complaints === "empty";
            if (!hadGoodData) {
              nextStatus.complaints = "error";
              nextStatus.complaintsError = message;
            }
            failures.push(`${label} complaints: ${message}`);
            complaintErr += 1;
            process.stdout.write(`complaints:EX(${message}) `);
          }
        }

        year.safetyStatus = nextStatus;
        process.stdout.write("\n");

        // Checkpoint frequently so quota/network issues don't lose progress.
        if (!dryRun && processed % 25 === 0) {
          fs.writeFileSync(OUT_PATH, `${JSON.stringify(catalog)}\n`);
          console.log(`  …checkpoint ${processed} years`);
        }
      }
    }
  }

  if (!dryRun) {
    fs.writeFileSync(OUT_PATH, `${JSON.stringify(catalog)}\n`);
  }

  console.log(
    [
      dryRun ? "Dry run — not written" : `Wrote ${OUT_PATH}`,
      `years=${processed}`,
      `recalls ok/empty/err=${recallOk}/${recallEmpty}/${recallErr}`,
      withComplaints
        ? `complaints ok/empty/err=${complaintOk}/${complaintEmpty}/${complaintErr}`
        : null,
    ]
      .filter(Boolean)
      .join(" | "),
  );

  if (recallErr > 0 || complaintErr > 0) {
    console.error(
      `\n${failures.length} NHTSA fetch(es) failed after retries (previous good data kept where it existed):`,
    );
    for (const f of failures.slice(0, 50)) console.error(`  - ${f}`);
    if (failures.length > 50) {
      console.error(`  … and ${failures.length - 50} more`);
    }
    // Fail loudly: a green run must mean every requested fetch succeeded.
    // `--allow-errors` is for local experiments only; CI never passes it.
    if (!argFlag("--allow-errors")) {
      process.exitCode = 1;
    }
  }
}

main().catch((err) => {
  console.error(err);
  process.exit(1);
});
