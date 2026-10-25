import { crudRoutes } from "@/lib/crudRoute";

const { PATCH, DELETE } = crudRoutes({
  table: "bucket_list",
  insertColumns: ["title", "done", "created_at"],
  patchColumns: ["title", "done"],
  orderBy: "created_at DESC",
  booleanColumns: ["done"],
});

export { PATCH, DELETE };
