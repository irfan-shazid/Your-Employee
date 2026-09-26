import { z } from "zod";
import { pageQuery } from "../../lib/pagination.js";
import { hireStatus, locationFields, optionalText, startDate, wageAmount, wageType, withValidLocation } from "../../shared/schemas.js";

export const hireListQuery = pageQuery.extend({ status: hireStatus.optional() });

export const directHireSchema = z
  .object({
    workerId: z.string().min(1),
    categoryId: z.string().min(1),
    title: z.string().trim().min(5, "Title is too short").max(90),
    description: optionalText(1000),
    wageAmount,
    wageType,
    startDate: startDate(90),
    ...locationFields,
    useCredit: z.boolean().default(true),
  })
  .superRefine(withValidLocation);

export const reviewSchema = z.object({
  rating: z.number().int().min(1).max(5),
  comment: optionalText(500),
});

export const useCreditSchema = z.object({ useCredit: z.boolean().default(true) });

export type DirectHireInput = z.infer<typeof directHireSchema>;
