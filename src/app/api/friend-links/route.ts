import { crudRoutes } from "@/lib/crudRoute";

const { GET, POST } = crudRoutes({
  table: "friend_links",
  insertColumns: ["role_a", "role_b", "anniversary", "created_at"],
  patchColumns: ["anniversary"],
  orderBy: "created_at DESC",
});

export { GET, POST };
