import { NextResponse } from "next/server";
import { searchCatalog } from "@/lib/catalog";

export function GET(request: Request) {
  const { searchParams } = new URL(request.url);
  const q = searchParams.get("q") ?? "";
  const results = searchCatalog(q);
  return NextResponse.json({ results });
}
