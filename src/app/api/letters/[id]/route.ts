import { crudRoutes } from "@/lib/crudRoute";

const { PATCH, DELETE } = crudRoutes({
  table: "letters",
  insertColumns: [
    "from_role",
    "to_role",
    "title",
    "body",
    "unlock_date",
    "created_at",
    "read_at",
  ],
  patchColumns: ["read_at", "hidden_by_from", "hidden_by_to"],
  orderBy: "created_at DESC",
  booleanColumns: ["hidden_by_from", "hidden_by_to"],
});

export { PATCH, DELETE };
