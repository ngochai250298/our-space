import { NextRequest, NextResponse } from "next/server";
import { db } from "@/lib/d1";
import { bucket } from "@/lib/r2";

/** Delete the file out of R2 first, then forget the row. */
export async function DELETE(
  _request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  const { id } = await params;
  const sql = db();
  const row = await sql
    .prepare("SELECT storage_path FROM gallery WHERE id = ?")
    .bind(id)
    .first<{ storage_path: string | null }>();
  if (row?.storage_path) await bucket().delete(row.storage_path);
  await sql.prepare("DELETE FROM gallery WHERE id = ?").bind(id).run();
  return new NextResponse(null, { status: 204 });
}
