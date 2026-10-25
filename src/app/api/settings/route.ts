import { NextRequest, NextResponse } from "next/server";
import { db, nowIso } from "@/lib/d1";

/**
 * The couple's shared settings — one row, id = 1: the anniversary, the next
 * meeting and its label. Everyone reads it; the settings page writes it.
 */
export async function GET() {
  const row = await db()
    .prepare("SELECT * FROM couple_settings WHERE id = 1")
    .first();
  return NextResponse.json(row);
}

export async function PUT(request: NextRequest) {
  const { anniversary, next_meeting, next_meeting_label } =
    (await request.json()) as {
      anniversary: string;
      next_meeting: string;
      next_meeting_label: string;
    };
  const updatedAt = nowIso();
  await db()
    .prepare(
      `INSERT INTO couple_settings (id, anniversary, next_meeting, next_meeting_label, updated_at)
       VALUES (1, ?, ?, ?, ?)
       ON CONFLICT (id) DO UPDATE SET anniversary = excluded.anniversary,
         next_meeting = excluded.next_meeting,
         next_meeting_label = excluded.next_meeting_label,
         updated_at = excluded.updated_at`
    )
    .bind(anniversary, next_meeting, next_meeting_label, updatedAt)
    .run();
  return NextResponse.json({ ok: true, updated_at: updatedAt });
}
