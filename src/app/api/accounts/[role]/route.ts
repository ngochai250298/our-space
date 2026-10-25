import { NextRequest, NextResponse } from "next/server";
import { db, nowIso } from "@/lib/d1";
import { bucket } from "@/lib/r2";

/** Only these columns can be patched from /admin. */
const PATCHABLE = ["display_name", "password", "avatar_url", "revoked_at"];

export async function PATCH(
  request: NextRequest,
  { params }: { params: Promise<{ role: string }> }
) {
  const { role } = await params;
  const body = (await request.json()) as Record<string, unknown>;
  const columns = PATCHABLE.filter((col) => col in body);
  const sets = [...columns.map((col) => `${col} = ?`), "updated_at = ?"];
  const values = [...columns.map((col) => body[col]), nowIso()];
  await db()
    .prepare(`UPDATE accounts SET ${sets.join(", ")} WHERE role = ?`)
    .bind(...values, role)
    .run();
  return NextResponse.json({ ok: true });
}

/**
 * Deleting an account takes everything that person left with it — photos and
 * avatars out of R2, then their rows — so a deleted account cannot come back
 * from a leftover row somewhere.
 */
export async function DELETE(
  _request: NextRequest,
  { params }: { params: Promise<{ role: string }> }
) {
  const { role } = await params;
  if (role === "anh" || role === "em")
    return new NextResponse("Không thể xoá tài khoản của Hải hoặc Bình.", {
      status: 400,
    });

  const sql = db();
  const store = bucket();

  const { results } = await sql
    .prepare("SELECT storage_path FROM gallery WHERE uploaded_by = ?")
    .bind(role)
    .all<{ storage_path: string | null }>();
  const keys = [
    ...results.map((row) => row.storage_path).filter((key): key is string => !!key),
    ...(await store.list({ prefix: "avatars/" })).objects
      .map((object) => object.key)
      .filter((key) => key.startsWith(`avatars/${role}-`)),
  ];
  if (keys.length > 0) await store.delete(keys);

  await sql.batch([
    sql.prepare("DELETE FROM gallery WHERE uploaded_by = ?").bind(role),
    sql.prepare("DELETE FROM diary WHERE author = ?").bind(role),
    sql
      .prepare("DELETE FROM letters WHERE from_role = ? OR to_role = ?")
      .bind(role, role),
    sql.prepare("DELETE FROM open_when WHERE from_role = ?").bind(role),
    sql.prepare("DELETE FROM locations WHERE role = ?").bind(role),
    sql
      .prepare("DELETE FROM friend_links WHERE role_a = ? OR role_b = ?")
      .bind(role, role),
    sql.prepare("DELETE FROM accounts WHERE role = ?").bind(role),
  ]);

  return new NextResponse(null, { status: 204 });
}
