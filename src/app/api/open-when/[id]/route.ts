import { crudRoutes } from "@/lib/crudRoute";

const { PATCH, DELETE } = crudRoutes({
  table: "open_when",
  insertColumns: ["label", "emoji", "body", "from_role", "opened_at", "created_at"],
  patchColumns: ["opened_at"],
  orderBy: "created_at DESC",
});

export { PATCH, DELETE };
