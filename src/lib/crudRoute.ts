import { NextRequest, NextResponse } from "next/server";
import { db, newId, nowIso } from "@/lib/d1";

/**
 * Most of the app's tables are the same shape: a text id, a few columns, and
 * one "list newest first" read. This builds the four handlers for such a
 * table once, and each route file just spells out its columns.
 *
 * SQLite has no booleans and no JSON, so `booleanColumns` are stored as 0/1
 * and `jsonColumns` as a TEXT blob; both are converted back on the way out.
 */
export interface CrudSpec {
  table: string;
  /** Columns a POST may fill, besides the generated `id`. */
  insertColumns: string[];
  /** Columns a PATCH may touch — anything else in the body is ignored. */
  patchColumns: string[];
  orderBy: string;
  booleanColumns?: string[];
  jsonColumns?: string[];
  /** Column bumped to "now" on every PATCH (e.g. updated_at). */
  touchColumn?: string;
}

type Row = Record<string, unknown>;
type Params = { params: Promise<{ id: string }> };

function fromRow(row: Row, spec: CrudSpec): Row {
  const out = { ...row };
  for (const col of spec.booleanColumns ?? []) out[col] = !!out[col];
  for (const col of spec.jsonColumns ?? []) {
    try {
      out[col] = JSON.parse(String(out[col] ?? "[]"));
    } catch {
      out[col] = [];
    }
  }
  return out;
}

function toBind(value: unknown, col: string, spec: CrudSpec): unknown {
  if (spec.booleanColumns?.includes(col)) return value ? 1 : 0;
  if (spec.jsonColumns?.includes(col)) return JSON.stringify(value ?? []);
  return value ?? null;
}

export function crudRoutes(spec: CrudSpec) {
  return {
    async GET() {
      const { results } = await db()
        .prepare(`SELECT * FROM ${spec.table} ORDER BY ${spec.orderBy}`)
        .all<Row>();
      return NextResponse.json(results.map((row) => fromRow(row, spec)));
    },

    async POST(request: NextRequest) {
      const body = (await request.json()) as Row;
      const id = typeof body.id === "string" ? body.id : newId();
      const columns = ["id", ...spec.insertColumns];
      const values = columns.map((col) =>
        col === "id"
          ? id
          : col === "created_at" && body.created_at == null
            ? nowIso()
            : toBind(body[col], col, spec)
      );
      const placeholders = columns.map(() => "?").join(", ");
      const sql = db();
      try {
        await sql
          .prepare(
            `INSERT INTO ${spec.table} (${columns.join(", ")}) VALUES (${placeholders})`
          )
          .bind(...values)
          .run();
      } catch (err) {
        const message = err instanceof Error ? err.message : String(err);
        // The UNIQUE constraints are how friend links stay one-per-pair.
        if (message.includes("UNIQUE"))
          return new NextResponse("duplicate", { status: 409 });
        throw err;
      }
      const created = await sql
        .prepare(`SELECT * FROM ${spec.table} WHERE id = ?`)
        .bind(id)
        .first<Row>();
      return NextResponse.json(fromRow(created as Row, spec), { status: 201 });
    },

    async PATCH(request: NextRequest, { params }: Params) {
      const { id } = await params;
      const body = (await request.json()) as Row;
      const columns = spec.patchColumns.filter((col) => col in body);
      const sets = columns.map((col) => `${col} = ?`);
      const values = columns.map((col) => toBind(body[col], col, spec));
      if (spec.touchColumn) {
        sets.push(`${spec.touchColumn} = ?`);
        values.push(nowIso());
      }
      if (sets.length === 0) return NextResponse.json({ ok: true });
      await db()
        .prepare(`UPDATE ${spec.table} SET ${sets.join(", ")} WHERE id = ?`)
        .bind(...values, id)
        .run();
      return NextResponse.json({ ok: true });
    },

    async DELETE(_request: NextRequest, { params }: Params) {
      const { id } = await params;
      await db().prepare(`DELETE FROM ${spec.table} WHERE id = ?`).bind(id).run();
      return new NextResponse(null, { status: 204 });
    },
  };
}
