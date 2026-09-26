/**
 * Reusable Zod building blocks. Bangladesh-specific formats are validated with regex so the
 * same rules can be mirrored on the client (mobile/src/lib/validation.ts).
 */
import { z } from "zod";
import { isValidLocation } from "./locations.js";

/** 01[3-9]XXXXXXXX, optional +88/88 prefix. Normalised to 01XXXXXXXXX. */
export const bdPhone = z
  .string()
  .trim()
  .transform((v) => v.replace(/[\s-]/g, ""))
  .refine((v) => /^(?:\+?88)?01[3-9]\d{8}$/.test(v), "Enter a valid Bangladeshi mobile number")
  .transform((v) => v.replace(/^(?:\+?88)/, ""));

/** National ID: 10 (smart card), 13 or 17 digits. */
export const nidNumber = z
  .string()
  .trim()
  .regex(/^(\d{10}|\d{13}|\d{17})$/, "NID must be 10, 13 or 17 digits");

export const personName = z
  .string()
  .trim()
  .min(2, "Name is too short")
  .max(80)
  .regex(/^[\p{L}\p{M}][\p{L}\p{M} .'-]*$/u, "Name can only contain letters, spaces, dots and hyphens");

/** Optional free text: empty strings become `null`. */
export const optionalText = (max: number) =>
  z
    .string()
    .trim()
    .max(max)
    .optional()
    .nullable()
    .transform((v) => (v ? v : null));

/** Calendar date `YYYY-MM-DD`, converted to a UTC-midnight `Date`. */
export const isoDate = z
  .string()
  .regex(/^\d{4}-\d{2}-\d{2}$/, "Use YYYY-MM-DD")
  .transform((v, ctx) => {
    const d = new Date(`${v}T00:00:00Z`);
    if (Number.isNaN(d.getTime())) {
      ctx.addIssue({ code: "custom", message: "Enter a real date" });
      return z.NEVER;
    }
    return d;
  });

const DAY_MS = 24 * 3600 * 1000;

/** A start date between yesterday and `maxDays` from today. */
export const startDate = (maxDays = 180) =>
  isoDate.refine((d) => {
    const today = new Date();
    today.setUTCHours(0, 0, 0, 0);
    return d.getTime() >= today.getTime() - DAY_MS && d.getTime() <= today.getTime() + maxDays * DAY_MS;
  }, `Start date must be within the next ${Math.round(maxDays / 30)} months`);

export const wageType = z.enum(["HOURLY", "DAILY", "MONTHLY", "FIXED"]);
export const availability = z.enum(["FULL_TIME", "PART_TIME", "DAILY", "WEEKENDS"]);
export const approvalStatus = z.enum(["PENDING", "APPROVED", "REJECTED", "SUSPENDED"]);
export const jobStatus = z.enum(["PENDING_PAYMENT", "OPEN", "FILLED", "CLOSED", "REMOVED"]);
export const hireStatus = z.enum(["PENDING_PAYMENT", "OFFERED", "ACTIVE", "COMPLETED", "DECLINED", "CANCELLED"]);
export const paymentPurpose = z.enum(["WORKER_SUBSCRIPTION", "JOB_POST", "HIRE"]);
export const paymentStatus = z.enum(["PENDING", "SUCCESS", "FAILED", "CANCELLED"]);

export const wageAmount = z.coerce.number().int().min(50, "Minimum wage is ৳50").max(500000);

/** Division → district → area, with the district checked against its division. */
export const locationFields = {
  division: z.string().trim().min(2).max(40),
  district: z.string().trim().min(2).max(40),
  area: z.string().trim().min(2, "Area is required").max(80),
  address: optionalText(200),
};

export const withValidLocation = <T extends { division: string; district: string }>(value: T, ctx: z.RefinementCtx) => {
  if (!isValidLocation(value.division, value.district)) {
    ctx.addIssue({ code: "custom", path: ["district"], message: "District does not belong to the selected division" });
  }
};

/** Our own uploads (`/api/media/<id>`) or an https URL (e.g. a Google avatar). */
export const imageUrl = z
  .string()
  .trim()
  .max(500)
  .regex(/^(\/api\/media\/[a-z0-9]+|https:\/\/[^\s]+)$/i, "Invalid image URL")
  .optional()
  .nullable()
  .transform((v) => v ?? null);

export const searchText = z.string().trim().max(60).optional();
