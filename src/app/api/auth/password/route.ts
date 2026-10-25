import { NextRequest, NextResponse } from "next/server";
import { db, nowIso } from "@/lib/d1";

/** Same floor the Settings screen asks for. */
const MIN_LENGTH = 4;

/**
 * Changing your own password. The old one is checked here, against the row in
 * D1 — the browser never learns anyone's password, so it couldn't check it
 * itself even if it wanted to.
 */
export async function POST(request: NextRequest) {
  const { role, oldPassword, newPassword } = (await request.json()) as {
    role?: string;
    oldPassword?: string;
    newPassword?: string;
  };
  if (!role || !oldPassword)
    return new NextResponse("Thiếu mật khẩu hiện tại.", { status: 400 });

  const row = await db()
    .prepare("SELECT password FROM accounts WHERE role = ?")
    .bind(role)
    .first<{ password: string }>();
  if (!row || row.password !== oldPassword)
    return new NextResponse("Mật khẩu hiện tại chưa đúng.", { status: 401 });

  const next = (newPassword ?? "").trim();
  if (next.length < MIN_LENGTH)
    return new NextResponse(
      `Mật khẩu mới phải từ ${MIN_LENGTH} ký tự trở lên.`,
      { status: 400 }
    );

  await db()
    .prepare("UPDATE accounts SET password = ?, updated_at = ? WHERE role = ?")
    .bind(next, nowIso(), role)
    .run();
  return NextResponse.json({ ok: true });
}
