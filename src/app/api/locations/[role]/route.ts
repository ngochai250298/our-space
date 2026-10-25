import { NextRequest, NextResponse } from "next/server";
import { db, nowIso } from "@/lib/d1";

/** One row per person, overwritten on every ping from their device. */
export async function PUT(
  request: NextRequest,
  { params }: { params: Promise<{ role: string }> }
) {
  const { role } = await params;
  const { lat, lng, accuracy } = (await request.json()) as {
    lat: number;
    lng: number;
    accuracy: number;
  };
  await db()
    .prepare(
      `INSERT INTO locations (role, lat, lng, accuracy, updated_at) VALUES (?, ?, ?, ?, ?)
       ON CONFLICT (role) DO UPDATE SET lat = excluded.lat, lng = excluded.lng,
         accuracy = excluded.accuracy, updated_at = excluded.updated_at`
    )
    .bind(role, lat, lng, accuracy, nowIso())
    .run();
  return NextResponse.json({ ok: true });
}
