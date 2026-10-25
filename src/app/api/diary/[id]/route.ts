import { crudRoutes } from "@/lib/crudRoute";

const { PATCH, DELETE } = crudRoutes({
  table: "diary",
  insertColumns: ["author", "date", "content", "photos", "created_at"],
  patchColumns: ["date", "content", "photos"],
  orderBy: "date DESC, created_at DESC",
  jsonColumns: ["photos"],
  touchColumn: "updated_at",
});

export { PATCH, DELETE };
