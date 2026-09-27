import { useState } from 'react';

import type { LocationValue } from '@/components/form/LocationFields';
import { collectErrors, normalizePhone, validators } from '@/lib/validation';
import { errorMessage, fieldErrors } from '@/store/api';
import { useAppDispatch } from '@/store/hooks';
import { toast } from '@/store/slices/ui';
import type { Availability, Gender, OwnWorker, WageType } from '@/types/api';
import { useSaveWorkerProfileMutation, type WorkerProfileInput } from '../api';

export const STEPS = [
  { title: 'About you', subtitle: 'Your identity is checked by our team before you go live.' },
  { title: 'Where you work', subtitle: 'Employers search for workers near them.' },
  { title: 'Your skills', subtitle: 'Pick the kinds of work you do (up to 5).' },
  { title: 'Pay & availability', subtitle: 'Tell employers what you expect.' },
] as const;

export type WorkerFormValues = {
  avatarUrl: string | null;
  fullName: string;
  phone: string;
  gender: Gender;
  dateOfBirth: string;
  nidNumber: string;
  nidImageId: string | null;
  location: LocationValue;
  categoryIds: string[];
  skills: string[];
  experienceYears: number;
  expectedWage: string;
  wageType: WageType;
  availability: Availability;
  bio: string;
};

export type FieldErrors = Record<string, string>;
export type SetField = <K extends keyof WorkerFormValues>(key: K, value: WorkerFormValues[K]) => void;

function initialValues(initial?: OwnWorker | null, defaultName?: string, defaultAvatar?: string | null): WorkerFormValues {
  return {
    avatarUrl: initial?.avatarUrl ?? defaultAvatar ?? null,
    fullName: initial?.fullName ?? defaultName ?? '',
    phone: initial?.phone ?? '',
    gender: initial?.gender ?? 'MALE',
    dateOfBirth: initial?.dateOfBirth?.slice(0, 10) ?? '',
    nidNumber: initial?.nidNumber ?? '',
    nidImageId: initial?.nidImageId ?? null,
    location: {
      division: initial?.division ?? '',
      district: initial?.district ?? '',
      area: initial?.area ?? '',
      address: initial?.address ?? '',
    },
    categoryIds: initial?.categories.map((c) => c.id) ?? [],
    skills: initial?.skills ?? [],
    experienceYears: initial?.experienceYears ?? 1,
    expectedWage: initial ? String(initial.expectedWage) : '',
    wageType: initial?.wageType ?? 'DAILY',
    availability: initial?.availability ?? 'DAILY',
    bio: initial?.bio ?? '',
  };
}

/** Client-side checks per step (mirrors the server's rules). */
function validateStep(step: number, v: WorkerFormValues) {
  switch (step) {
    case 0:
      return collectErrors({
        fullName: validators.name(v.fullName),
        phone: validators.phone(v.phone),
        dateOfBirth: validators.dateOfBirth(v.dateOfBirth),
        nidNumber: validators.nid(v.nidNumber),
      });
    case 1:
      return collectErrors({
        division: validators.required(v.location.division, 'Division'),
        district: validators.required(v.location.district, 'District'),
        area: v.location.area.trim().length >= 2 ? undefined : 'Area is required',
      });
    case 2:
      return collectErrors({ categoryIds: v.categoryIds.length ? undefined : 'Pick at least one type of work' });
    default:
      return collectErrors({ expectedWage: validators.number(v.expectedWage, { min: 50, max: 200000, label: 'Wage' }) });
  }
}

function toPayload(v: WorkerFormValues): WorkerProfileInput {
  return {
    fullName: v.fullName.trim(),
    phone: normalizePhone(v.phone),
    gender: v.gender,
    dateOfBirth: v.dateOfBirth,
    nidNumber: v.nidNumber.trim(),
    nidImageId: v.nidImageId,
    avatarUrl: v.avatarUrl,
    division: v.location.division,
    district: v.location.district,
    area: v.location.area.trim(),
    address: v.location.address.trim() || null,
    bio: v.bio.trim() || null,
    skills: v.skills,
    experienceYears: v.experienceYears,
    expectedWage: Number(v.expectedWage),
    wageType: v.wageType,
    availability: v.availability,
    categoryIds: v.categoryIds,
  };
}

/** Which step a server-side field error belongs to. */
const STEP_OF_FIELD: Record<string, number> = {
  fullName: 0,
  phone: 0,
  dateOfBirth: 0,
  nidNumber: 0,
  division: 1,
  district: 1,
  area: 1,
  categoryIds: 2,
};

/** State, validation, step navigation and submission for the 4-step worker profile form. */
export function useWorkerProfileForm(opts: { initial?: OwnWorker | null; defaultName?: string; defaultAvatar?: string | null; onSaved: () => void }) {
  const dispatch = useAppDispatch();
  const [save, { isLoading: saving }] = useSaveWorkerProfileMutation();
  const [step, setStep] = useState(0);
  const [errors, setErrors] = useState<FieldErrors>({});
  const [values, setValues] = useState(() => initialValues(opts.initial, opts.defaultName, opts.defaultAvatar));

  const set: SetField = (key, value) => setValues((v) => ({ ...v, [key]: value }));
  const isLastStep = step === STEPS.length - 1;

  const back = () => {
    setErrors({});
    setStep((s) => Math.max(0, s - 1));
  };

  /** Validate the current step, then go to the next one or submit. Returns true when it moved forward. */
  const next = async () => {
    const found = validateStep(step, values);
    setErrors(found ?? {});
    if (found) return false;
    if (!isLastStep) {
      setStep(step + 1);
      return true;
    }
    try {
      await save(toPayload(values)).unwrap();
      opts.onSaved();
      return true;
    } catch (err) {
      const fields = fieldErrors(err);
      setErrors(fields);
      const firstStep = Math.min(...Object.keys(fields).map((k) => STEP_OF_FIELD[k] ?? STEPS.length - 1));
      if (Number.isFinite(firstStep)) setStep(firstStep);
      dispatch(toast('error', "Couldn't save your profile", errorMessage(err)));
      return false;
    }
  };

  return { step, isLastStep, values, set, errors, next, back, saving };
}
