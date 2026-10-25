import { NextResponse } from "next/server";
import { db } from "@/lib/d1";

/** Every known position — the map reads this to place the other markers. */
export async function GET() {
  const { results } = await db().prepare("SELECT * FROM locations").all();
  return NextResponse.json(results);
}
