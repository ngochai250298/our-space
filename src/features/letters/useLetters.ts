"use client";

import { useMemo } from "react";
import type { Letter, Role, Session } from "@/types";
import { canSee } from "@/lib/auth";
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
  created_at: string;
  read_at: string | null;
  hidden_by_from?: boolean;
  hidden_by_to?: boolean;
}

const SPEC: CloudSpec<Letter> = {
  endpoint: "/api/letters",
  localKey: "letters",
  errorHint:
    "Thư đang lưu tạm trên thiết bị — thử tải lại trang để đồng bộ lại.",
  fromRow: (raw) => {
    const row = raw as unknown as LetterRow;
    return {
      id: row.id,
      from: row.from_role,
      to: row.to_role,
      title: row.title,
      body: row.body,
      createdAt: new Date(row.created_at).getTime(),
      readAt: row.read_at ? new Date(row.read_at).getTime() : undefined,
      hiddenByFrom: row.hidden_by_from ?? false,
      hiddenByTo: row.hidden_by_to ?? false,
    };
  },
  toInsertRow: (letter) => ({
    from_role: letter.from,
    to_role: letter.to,
    title: letter.title,
    body: letter.body,
    // Legacy NOT NULL column, no longer used — fill it with the send date so
    // inserts keep working without a schema change.
    unlock_date: new Date(letter.createdAt).toISOString().slice(0, 10),
    created_at: new Date(letter.createdAt).toISOString(),
    read_at: letter.readAt ? new Date(letter.readAt).toISOString() : null,
  }),
  toPatchRow: (patch) => ({
    ...(patch.readAt !== undefined
      ? { read_at: new Date(patch.readAt).toISOString() }
      : {}),
    ...(patch.hiddenByFrom !== undefined
      ? { hidden_by_from: patch.hiddenByFrom }
      : {}),
    ...(patch.hiddenByTo !== undefined
      ? { hidden_by_to: patch.hiddenByTo }
      : {}),
  }),
};

export function useLetters(session: Session | null): CloudCollection<Letter> {
  const collection = useCloudCollection(SPEC, session);

  // A letter stays visible only while both ends are still in the viewer's
  // circle — so a letter from someone the admin has since moved out of it
  // (or a friend who was never in it) drops out of the inbox, the "sent"
  // tab and the unread badge together. A null session is the admin
  // screen, which is meant to see every letter.
  const items = useMemo(
    () =>
      session
        ? collection.items.filter(
            (l) => canSee(session.role, l.from) && canSee(session.role, l.to)
          )
        : collection.items,
    [collection.items, session]
  );

  return { ...collection, items };
}
