import { z } from "zod";
import {
  availability,
  bdPhone,
  imageUrl,
  isoDate,
  locationFields,
  nidNumber,
  optionalText,
  personName,
  wageType,
  withValidLocation,
} from "../../shared/schemas.js";

const YEAR_MS = 365.25 * 24 * 3600 * 1000;

export const workerProfileSchema = z
  .object({
    fullName: personName,
    phone: bdPhone,
    gender: z.enum(["MALE", "FEMALE", "OTHER"]),
    dateOfBirth: isoDate.refine((d) => {
      const age = (Date.now() - d.getTime()) / YEAR_MS;
      return age >= 18 && age <= 75;
    }, "You must be between 18 and 75 years old"),
    nidNumber,
    nidImageId: z.string().trim().max(40).optional().nullable().transform((v) => v ?? null),
    avatarUrl: imageUrl,
    ...locationFields,
    bio: optionalText(500),
    // Stored lowercase + de-duplicated so the employer search can match skills exactly.
    skills: z
      .array(z.string().trim().min(2).max(30))
      .max(15)
      .default([])
      .transform((list) => [...new Set(list.map((s) => s.toLowerCase()))]),
    experienceYears: z.coerce.number().int().min(0).max(50),
    expectedWage: z.coerce.number().int().min(50, "Minimum wage is ৳50").max(200000),
    wageType,
    availability,
    categoryIds: z.array(z.string().min(1)).min(1, "Pick at least one type of work").max(5, "Pick up to 5"),
  })
  .superRefine(withValidLocation);

export const employerProfileSchema = z
  .object({
    type: z.enum(["INDIVIDUAL", "BUSINESS"]),
    fullName: personName,
    companyName: optionalText(100),
    phone: bdPhone,
    nidNumber: nidNumber.optional().nullable().transform((v) => v ?? null),
    tradeLicense: optionalText(40),
    avatarUrl: imageUrl,
    ...locationFields,
    about: optionalText(500),
  })
  .superRefine(withValidLocation)
  .refine((v) => v.type === "INDIVIDUAL" || Boolean(v.companyName), {
    message: "Business name is required",
    path: ["companyName"],
  })
  .refine((v) => Boolean(v.nidNumber || v.tradeLicense), {
    message: "Provide your NID number or a trade license number",
    path: ["nidNumber"],
  });

export const availabilitySchema = z.object({ isAvailable: z.boolean() });

export type WorkerProfileInput = z.infer<typeof workerProfileSchema>;
export type EmployerProfileInput = z.infer<typeof employerProfileSchema>;
