"use client";

import type { BucketItem, Session } from "@/types";
import {
  useCloudCollection,
  type CloudCollection,
  type CloudSpec,
} from "@/hooks/useCloudCollection";

interface BucketRow {
  id: string;
  title: string;
  done: boolean;
  created_at: string;
}

const SPEC: CloudSpec<BucketItem> = {
  table: "bucket_list",
  localKey: "bucketList",
  errorHint:
    "Danh sách đang lưu tạm trên thiết bị — chạy file supabase/migration3_letters_openwhen_bucket.sql trong Supabase để hai người cùng thấy.",
  orderColumn: "created_at",
  fromRow: (raw) => {
    const row = raw as unknown as BucketRow;
    return {
      id: row.id,
      title: row.title,
      done: row.done,
      createdAt: new Date(row.created_at).getTime(),
    };
  },
  toInsertRow: (item) => ({
    title: item.title,
    done: item.done,
    created_at: new Date(item.createdAt).toISOString(),
  }),
  toPatchRow: (patch) => ({
    ...(patch.done !== undefined ? { done: patch.done } : {}),
    ...(patch.title !== undefined ? { title: patch.title } : {}),
  }),
};

export function useBucketList(
  session: Session | null
): CloudCollection<BucketItem> {
  return useCloudCollection(SPEC, session);
}
