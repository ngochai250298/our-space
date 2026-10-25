import { NextRequest, NextResponse } from "next/server";
import { db, nowIso } from "@/lib/d1";

/**
 * The account list. The whole app reads it (display names, avatars, who is
 * couple/family/friend); only /admin writes it.
 *
 * Passwords are deliberately NOT in this response: it answers anyone who asks,
 * so anything in it is public. Signing in and changing a password are checked
 * on the server instead (/api/auth/login and /api/auth/password).
 */
export async function GET() {
  const { results } = await db()
    .prepare(
      "SELECT role, username, display_name, kind, gender, avatar_url, revoked_at FROM accounts"
    )
    .all();
  return NextResponse.json(results);
}

export async function POST(request: NextRequest) {
  const body = (await request.json()) as {
    role?: string;
    username?: string;
    display_name?: string;
    password?: string;
    kind?: string;
    gender?: string;
  };
  if (!body.role || !body.username || !body.display_name || !body.password)
    return new NextResponse("Thiếu thông tin tài khoản.", { status: 400 });

  try {
    await db()
      .prepare(
        `INSERT INTO accounts (role, username, display_name, password, kind, gender, updated_at)
         VALUES (?, ?, ?, ?, ?, ?, ?)`
      )
      .bind(
        body.role,
        body.username,
        body.display_name,
        body.password,
        body.kind,
        body.gender,
        nowIso()
      )
      .run();
  } catch (err) {
    const message = err instanceof Error ? err.message : String(err);
    if (message.includes("UNIQUE"))
      return new NextResponse(
        `Tên đăng nhập "${body.username}" đã có người dùng.`,
        { status: 409 }
      );
    throw err;
  }
  return NextResponse.json({ ok: true }, { status: 201 });
}
