import type { YearComplaintSummary } from "@/data/catalog";

/**
 * Top-component rows plus an "Other" remainder so the breakdown sums to the
 * headline complaint total (NHTSA enrich only stores the top components).
 */
export function complaintRowsWithOther(
  complaints: Pick<YearComplaintSummary, "total" | "byComponent">,
): Array<{ component: string; count: number }> {
  const rows = complaints.byComponent.filter((r) => r.count > 0);
  const listed = rows.reduce((sum, r) => sum + r.count, 0);
  const remainder = complaints.total - listed;
  return remainder > 0
    ? [...rows, { component: "Other", count: remainder }]
    : rows;
}
