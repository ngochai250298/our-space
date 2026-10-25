import { NextRequest, NextResponse } from "next/server";
import { db } from "@/lib/d1";

/**
 * Login happens on the server so passwords stay in D1 and never reach the
 * browser. The session the client keeps is just who you are.
 */
export async function POST(request: NextRequest) {
  const { username, password } = (await request.json()) as {
    username?: string;
    password?: string;
  };
  const name = (username ?? "").trim().toLowerCase();
  if (!name || !password)
    return new NextResponse("Thiếu tên đăng nhập hoặc mật khẩu.", {
      status: 400,
    });

  const row = await db()
    .prepare(
      "SELECT role, display_name, password, kind, gender FROM accounts WHERE username = ?"
    )
    .bind(name)
    .first<{
      role: string;
      display_name: string;
      password: string;
      kind: string;
      gender: string;
    }>();

  if (!row || row.password !== password)
    return new NextResponse("Sai tên đăng nhập hoặc mật khẩu.", { status: 401 });

  return NextResponse.json({
    role: row.role,
    displayName: row.display_name,
    kind: row.kind,
    gender: row.gender,
  });
}
