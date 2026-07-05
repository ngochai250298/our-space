"use client";

import type { OpenWhenEnvelope, Role, Session } from "@/types";
import {
  useCloudCollection,
  type CloudCollection,
  type CloudSpec,
} from "@/hooks/useCloudCollection";

interface OpenWhenRow {
  id: string;
  label: string;
  emoji: string;
  body: string;
  from_role: Role;
  opened_at: string | null;
  created_at: string;
}

const SPEC: CloudSpec<OpenWhenEnvelope> = {
  table: "open_when",
  localKey: "openWhen",
  errorHint:
    "Phong bì đang lưu tạm trên thiết bị — chạy file supabase/migration3_letters_openwhen_bucket.sql trong Supabase để hai người cùng thấy.",
  orderColumn: "created_at",
  fromRow: (raw) => {
    const row = raw as unknown as OpenWhenRow;
    return {
      id: row.id,
      label: row.label,
      emoji: row.emoji,
      body: row.body,
      from: row.from_role,
      openedAt: row.opened_at ? new Date(row.opened_at).getTime() : undefined,
    };
  },
  toInsertRow: (env) => ({
    label: env.label,
    emoji: env.emoji,
    body: env.body,
    from_role: env.from,
    opened_at: env.openedAt ? new Date(env.openedAt).toISOString() : null,
  }),
  toPatchRow: (patch) => ({
    ...(patch.openedAt !== undefined
      ? { opened_at: new Date(patch.openedAt).toISOString() }
      : {}),
  }),
};

export function useOpenWhen(
  session: Session | null
): CloudCollection<OpenWhenEnvelope> {
  return useCloudCollection(SPEC, session);
}
