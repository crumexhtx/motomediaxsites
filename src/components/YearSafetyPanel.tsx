import type { YearComplaintSummary, YearRecall } from "@/data/catalog";

type Props = {
  yearLabel: string;
  makeName: string;
  modelName: string;
  recalls?: YearRecall[];
  complaints?: YearComplaintSummary;
  recallsStatus?: "ok" | "empty" | "error";
  complaintsStatus?: "ok" | "empty" | "error";
  recallsError?: string;
  complaintsError?: string;
};

function RecallRow({ recall }: { recall: YearRecall }) {
  const href = `https://www.nhtsa.gov/recalls?nhtsaId=${encodeURIComponent(recall.campaignNumber)}`;
  return (
    <li className="border-b border-line/60 py-3 last:border-0">
      <div className="flex flex-wrap items-baseline justify-between gap-x-3 gap-y-1">
        <p className="font-medium text-foreground">{recall.component}</p>
        <p className="text-xs tabular-nums text-muted">{recall.date}</p>
      </div>
      <p className="mt-1 text-sm leading-relaxed text-muted">{recall.summary}</p>
      <p className="mt-1.5 text-xs text-muted">
        Campaign{" "}
        <a
          href={href}
          className="underline-offset-2 hover:underline"
          rel="noreferrer"
          target="_blank"
        >
          {recall.campaignNumber}
        </a>
      </p>
    </li>
  );
}

export function YearSafetyPanel({
  yearLabel,
  makeName,
  modelName,
  recalls,
  complaints,
  recallsStatus,
  complaintsStatus,
  recallsError,
  complaintsError,
}: Props) {
  const recallList = recalls ?? [];
  const showRecalls =
    recallsStatus === "ok" ||
    recallsStatus === "empty" ||
    recallsStatus === "error" ||
    recallList.length > 0;
  const showComplaints =
    complaintsStatus === "ok" ||
    complaintsStatus === "empty" ||
    complaintsStatus === "error" ||
    Boolean(complaints);

  if (!showRecalls && !showComplaints) return null;

  return (
    <section className="mb-12">
      <h2 className="font-display text-2xl tracking-tight">
        Used-buyer checks
      </h2>
      <p className="mt-2 max-w-2xl text-sm text-muted md:text-base">
        NHTSA recalls and owner-complaint patterns for the {yearLabel}{" "}
        {makeName} {modelName} — the issues that matter before you buy used.
      </p>

      {showRecalls ? (
        <div className="mt-6 max-w-3xl">
          <h3 className="text-xs uppercase tracking-[0.16em] text-muted">
            Recalls
          </h3>
          {recallsStatus === "error" ? (
            <p className="mt-2 text-sm text-muted">
              Recall fetch failed
              {recallsError ? ` (${recallsError})` : ""}. Check{" "}
              <a
                href="https://www.nhtsa.gov/recalls"
                className="underline-offset-2 hover:underline"
                rel="noreferrer"
                target="_blank"
              >
                NHTSA.gov/recalls
              </a>{" "}
              before buying.
            </p>
          ) : recallList.length === 0 ? (
            <p className="mt-2 text-sm text-muted">
              No NHTSA recalls listed for this model year in our last refresh.
            </p>
          ) : (
            <ul className="mt-2">
              {recallList.map((r) => (
                <RecallRow key={r.campaignNumber} recall={r} />
              ))}
            </ul>
          )}
        </div>
      ) : null}

      {showComplaints ? (
        <div className="mt-8 max-w-3xl">
          <h3 className="text-xs uppercase tracking-[0.16em] text-muted">
            Owner complaints
          </h3>
          {complaintsStatus === "error" ? (
            <p className="mt-2 text-sm text-muted">
              Complaint fetch failed
              {complaintsError ? ` (${complaintsError})` : ""}.
            </p>
          ) : !complaints || complaints.total === 0 ? (
            <p className="mt-2 text-sm text-muted">
              No owner complaints filed with NHTSA for this model year in our
              last refresh.
            </p>
          ) : (
            <>
              <p className="mt-2 text-sm text-muted">
                <span className="font-medium text-foreground">
                  {complaints.total}
                </span>{" "}
                complaints
                {complaints.crashCount
                  ? ` · ${complaints.crashCount} crash-related`
                  : ""}
                {complaints.fireCount
                  ? ` · ${complaints.fireCount} fire-related`
                  : ""}
                {complaints.injuryCount
                  ? ` · ${complaints.injuryCount} injuries reported`
                  : ""}
                . Top components:
              </p>
              <ul className="mt-3 grid gap-2 sm:grid-cols-2">
                {complaints.byComponent.map((row) => (
                  <li
                    key={row.component}
                    className="flex items-baseline justify-between gap-3 border-b border-line/50 py-1.5 text-sm"
                  >
                    <span>{row.component}</span>
                    <span className="tabular-nums text-muted">{row.count}</span>
                  </li>
                ))}
              </ul>
              <p className="mt-3 text-xs text-muted">
                Counts are owner reports to NHTSA, not verified defect rates.
                Source:{" "}
                <a
                  href="https://www.nhtsa.gov/report-a-safety-problem"
                  className="underline-offset-2 hover:underline"
                  rel="noreferrer"
                  target="_blank"
                >
                  NHTSA complaints
                </a>
                .
              </p>
            </>
          )}
        </div>
      ) : null}
    </section>
  );
}
