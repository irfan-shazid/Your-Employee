import { z } from "zod";
import { pageQuery } from "../../lib/pagination.js";
import { searchText } from "../../shared/schemas.js";

export const workerSearchQuery = pageQuery.extend({
  categoryId: z.string().optional(),
  division: z.string().optional(),
  district: z.string().optional(),
  q: searchText,
  minRating: z.coerce.number().min(0).max(5).optional(),
  sort: z.enum(["rating", "experience", "wage", "newest"]).default("rating"),
});

export type WorkerSearch = z.infer<typeof workerSearchQuery>;
