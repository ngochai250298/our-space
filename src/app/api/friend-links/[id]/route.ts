import { crudRoutes } from "@/lib/crudRoute";

const { PATCH, DELETE } = crudRoutes({
  table: "friend_links",
  insertColumns: ["role_a", "role_b", "anniversary", "created_at"],
  patchColumns: ["anniversary"],
  orderBy: "created_at DESC",
});

export { PATCH, DELETE };
