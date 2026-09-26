import { z } from "zod";
import { pageQuery } from "../../lib/pagination.js";
import { approvalStatus, jobStatus, optionalText, paymentPurpose, paymentStatus, searchText } from "../../shared/schemas.js";

export const profileListQuery = pageQuery.extend({ status: approvalStatus.optional(), q: searchText });
export const userListQuery = pageQuery.extend({ q: searchText, role: z.enum(["WORKER", "EMPLOYER", "ADMIN", "NONE"]).optional() });
export const paymentListQuery = pageQuery.extend({ status: paymentStatus.optional(), purpose: paymentPurpose.optional() });
export const jobListQuery = pageQuery.extend({ status: jobStatus.optional(), q: searchText });

export const decisionSchema = z
  .object({
    action: z.enum(["approve", "reject", "suspend", "reinstate"]),
    reason: optionalText(300),
  })
  .refine((v) => (v.action === "reject" || v.action === "suspend" ? Boolean(v.reason) : true), {
    message: "Please give a reason so the user knows what to fix",
    path: ["reason"],
  });

export const removeJobSchema = z.object({ reason: z.string().trim().min(3).max(300) });

export const categorySchema = z.object({
  name: z.string().trim().min(2).max(50),
  nameBn: z.string().trim().min(1).max(50),
  icon: z.string().trim().regex(/^[a-z0-9-]+$/, "Use an Ionicons name like 'hammer'").max(40),
  sortOrder: z.number().int().min(0).max(1000).default(0),
  isActive: z.boolean().default(true),
});

export type Decision = z.infer<typeof decisionSchema>;
