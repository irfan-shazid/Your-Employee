import { z } from "zod";
import { pageQuery } from "../../lib/pagination.js";
import {
  jobStatus,
  locationFields,
  optionalText,
  searchText,
  startDate,
  wageAmount,
  wageType,
  withValidLocation,
} from "../../shared/schemas.js";

export const jobFeedQuery = pageQuery.extend({
  categoryId: z.string().optional(),
  division: z.string().optional(),
  district: z.string().optional(),
  q: searchText,
  urgent: z.enum(["true", "false"]).optional(),
  sort: z.enum(["newest", "wage", "start"]).default("newest"),
});

export const myJobsQuery = pageQuery.extend({ status: jobStatus.optional() });

export const createJobSchema = z
  .object({
    title: z.string().trim().min(5, "Title is too short").max(90),
    categoryId: z.string().min(1, "Choose a category"),
    description: z.string().trim().min(20, "Describe the work in at least 20 characters").max(2000),
    wageAmount,
    wageType,
    workersNeeded: z.coerce.number().int().min(1).max(100),
    startDate: startDate(180),
    durationDays: z.coerce.number().int().min(1).max(365),
    ...locationFields,
    isUrgent: z.boolean().default(false),
  })
  .superRefine(withValidLocation);

export const applySchema = z.object({ message: optionalText(500) });

export type JobFeedQuery = z.infer<typeof jobFeedQuery>;
export type CreateJobInput = z.infer<typeof createJobSchema>;
