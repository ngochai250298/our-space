"use client";

import type { Letter, Role, Session } from "@/types";
import {
  useCloudCollection,
  type CloudCollection,
  type CloudSpec,
} from "@/hooks/useCloudCollection";

interface LetterRow {
  id: string;
  from_role: Role;
  to_role: Role;
  title: string;
  body: string;
  unlock_date: string;
  created_at: string;
  read_at: string | null;
}

const SPEC: CloudSpec<Letter> = {
  table: "letters",
  localKey: "letters",
  errorHint:
    "Thư đang lưu tạm trên thiết bị — chạy file supabase/migration3_letters_openwhen_bucket.sql trong Supabase để hai người cùng thấy.",
  orderColumn: "created_at",
  fromRow: (raw) => {
    const row = raw as unknown as LetterRow;
    return {
      id: row.id,
      from: row.from_role,
      to: row.to_role,
      title: row.title,
      body: row.body,
      unlockDate: row.unlock_date,
      createdAt: new Date(row.created_at).getTime(),
      readAt: row.read_at ? new Date(row.read_at).getTime() : undefined,
    };
  },
  toInsertRow: (letter) => ({
    from_role: letter.from,
    to_role: letter.to,
    title: letter.title,
    body: letter.body,
    unlock_date: letter.unlockDate,
    created_at: new Date(letter.createdAt).toISOString(),
    read_at: letter.readAt ? new Date(letter.readAt).toISOString() : null,
  }),
  toPatchRow: (patch) => ({
    ...(patch.readAt !== undefined
      ? { read_at: new Date(patch.readAt).toISOString() }
      : {}),
  }),
};

export function useLetters(session: Session | null): CloudCollection<Letter> {
  return useCloudCollection(SPEC, session);
}
