import { NextResponse } from "next/server";
import { searchCatalog } from "@/lib/catalog";

const MAX_QUERY_LENGTH = 80;
const RESULT_LIMIT = 40;

export function GET(request: Request) {
  const { searchParams } = new URL(request.url);
  const q = (searchParams.get("q") ?? "").slice(0, MAX_QUERY_LENGTH);
  const results = searchCatalog(q, RESULT_LIMIT);
  return NextResponse.json(
    { results },
    {
      headers: {
        "Cache-Control": "public, s-maxage=60, stale-while-revalidate=300",
      },
    },
  );
}
