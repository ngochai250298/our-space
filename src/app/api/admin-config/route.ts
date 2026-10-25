import { NextRequest, NextResponse } from "next/server";
import { db, nowIso } from "@/lib/d1";

/**
 * The /admin password. It used to sit in src/config.ts, which meant it
 * shipped to every browser; now it lives in the app_config row and only the
 * Worker reads it.
 */
async function currentPassword(): Promise<string> {
  const row = await db()
    .prepare("SELECT admin_password FROM app_config WHERE id = 1")
    .first<{ admin_password: string }>();
  return row?.admin_password ?? "";
}

export async function GET() {
  return NextResponse.json({ admin_password: await currentPassword() });
}

export async function PUT(request: NextRequest) {
  const { oldPassword, newPassword } = (await request.json()) as {
    oldPassword: string;
    newPassword: string;
  };
  const current = await currentPassword();
  if (oldPassword !== current)
    return new NextResponse("Mật khẩu hiện tại không đúng.", { status: 400 });
  const next = (newPassword ?? "").trim();
  if (next.length < 4)
    return new NextResponse("Mật khẩu mới phải từ 4 ký tự trở lên.", {
      status: 400,
    });
  if (next === current)
    return new NextResponse("Mật khẩu mới trùng mật khẩu cũ.", { status: 400 });
  await db()
    .prepare("UPDATE app_config SET admin_password = ?, updated_at = ? WHERE id = 1")
    .bind(next, nowIso())
    .run();
  return NextResponse.json({ ok: true });
}
