/**
 * Client-side validators (regex based) mirroring the server rules in server/src/lib/http.ts,
 * so users get instant feedback before a request is sent.
 */

export const patterns = {
  email: /^[^\s@]+@[^\s@]+\.[^\s@]{2,}$/,
  // 01XXXXXXXXX with an optional +88 / 88 prefix; operator digit 3-9
  bdPhone: /^(?:\+?88)?01[3-9]\d{8}$/,
  nid: /^(\d{10}|\d{13}|\d{17})$/,
  name: /^[\p{L}\p{M}][\p{L}\p{M} .'-]*$/u,
  isoDate: /^\d{4}-\d{2}-\d{2}$/,
  digits: /^\d+$/,
};

export function normalizePhone(v: string) {
  return v.replace(/[\s-]/g, '').replace(/^(?:\+?88)/, '');
}

export const validators = {
  email(v: string) {
    if (!v.trim()) return 'Email is required';
    return patterns.email.test(v.trim()) ? undefined : 'Enter a valid email address';
  },
  password(v: string) {
    if (v.length < 8) return 'Use at least 8 characters';
    if (!/[A-Za-z]/.test(v) || !/\d/.test(v)) return 'Use letters and numbers';
    return undefined;
  },
  name(v: string) {
    const t = v.trim();
    if (t.length < 2) return 'Enter your full name';
    return patterns.name.test(t) ? undefined : 'Only letters, spaces, dots and hyphens';
  },
  phone(v: string) {
    if (!v.trim()) return 'Mobile number is required';
    return patterns.bdPhone.test(v.replace(/[\s-]/g, '')) ? undefined : 'Enter a valid number like 01712345678';
  },
  nid(v: string, required = true) {
    if (!v.trim()) return required ? 'NID number is required' : undefined;
    return patterns.nid.test(v.trim()) ? undefined : 'NID must be 10, 13 or 17 digits';
  },
  required(v: string | null | undefined, label: string) {
    return v && String(v).trim() ? undefined : `${label} is required`;
  },
  number(v: string, { min, max, label }: { min: number; max: number; label: string }) {
    if (!patterns.digits.test(v)) return `${label} must be a number`;
    const n = Number(v);
    if (n < min) return `${label} must be at least ${min}`;
    if (n > max) return `${label} must be at most ${max}`;
    return undefined;
  },
  dateOfBirth(v: string) {
    if (!patterns.isoDate.test(v)) return 'Use the format YYYY-MM-DD';
    const d = new Date(`${v}T00:00:00Z`);
    if (Number.isNaN(d.getTime())) return 'Enter a real date';
    const age = (Date.now() - d.getTime()) / (365.25 * 86_400_000);
    if (age < 18) return 'You must be at least 18 years old';
    if (age > 75) return 'Please check the year';
    return undefined;
  },
};

/** Drop undefined entries; returns null when the form is valid. */
export function collectErrors<T extends Record<string, string | undefined>>(errors: T) {
  const clean = Object.fromEntries(Object.entries(errors).filter(([, v]) => v)) as Record<string, string>;
  return Object.keys(clean).length ? clean : null;
}
