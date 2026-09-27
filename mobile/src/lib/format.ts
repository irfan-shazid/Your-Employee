import type Ionicons from '@expo/vector-icons/Ionicons';
import type { ComponentProps } from 'react';

import type { Availability, PaymentProvider, WageType } from '@/types/api';

type IconName = ComponentProps<typeof Ionicons>['name'];
type Tone = 'primary' | 'success' | 'warning' | 'danger' | 'info' | 'neutral' | 'accent';

/** ৳1,250 */
export function taka(amount: number) {
  return `৳${amount.toLocaleString('en-IN')}`;
}

// Payments are stored in the currency's minor unit (poisha, cents). These have no decimals.
const ZERO_DECIMAL = new Set(['BIF', 'CLP', 'DJF', 'GNF', 'JPY', 'KMF', 'KRW', 'MGA', 'PYG', 'RWF', 'UGX', 'VND', 'VUV', 'XAF', 'XOF', 'XPF']);
const SYMBOLS: Record<string, string> = { BDT: '৳', USD: '$', EUR: '€', GBP: '£', INR: '₹', JPY: '¥', AUD: 'A$', CAD: 'C$', SGD: 'S$' };

export const toMajor = (minor: number, currency: string) => minor / (ZERO_DECIMAL.has(currency.toUpperCase()) ? 1 : 100);
export const currencySymbol = (currency: string) => SYMBOLS[currency.toUpperCase()] ?? `${currency.toUpperCase()} `;

/** Minor units → ৳50, $0.50, €12.00 */
export function money(minor: number, currency: string) {
  const code = currency.toUpperCase();
  const major = toMajor(minor, code);
  if (code === 'BDT') return taka(major);
  const digits = ZERO_DECIMAL.has(code) ? 0 : 2;
  return `${currencySymbol(code)}${major.toLocaleString('en-US', { minimumFractionDigits: digits, maximumFractionDigits: digits })}`;
}

/** Sum paid amounts per currency, never mixing them: "৳140 · $3.50". */
export function moneyTotals(items: { amount: number; currency: string }[]) {
  const totals = new Map<string, number>();
  for (const { amount, currency } of items) totals.set(currency, (totals.get(currency) ?? 0) + amount);
  return [...totals].map(([currency, amount]) => money(amount, currency)).join(' · ');
}

const wageSuffix: Record<WageType, string> = { HOURLY: '/hr', DAILY: '/day', MONTHLY: '/month', FIXED: ' total' };
export const wageTypeLabel: Record<WageType, string> = { HOURLY: 'Per hour', DAILY: 'Per day', MONTHLY: 'Per month', FIXED: 'Fixed price' };

export function wage(amount: number, type: WageType) {
  return `${taka(amount)}${wageSuffix[type]}`;
}

export const availabilityLabel: Record<Availability, string> = {
  FULL_TIME: 'Full time',
  PART_TIME: 'Part time',
  DAILY: 'Daily work',
  WEEKENDS: 'Weekends',
};

const MONTHS = ['Jan', 'Feb', 'Mar', 'Apr', 'May', 'Jun', 'Jul', 'Aug', 'Sep', 'Oct', 'Nov', 'Dec'];
const DAYS = ['Sun', 'Mon', 'Tue', 'Wed', 'Thu', 'Fri', 'Sat'];

/** 12 Oct 2026 */
export function formatDate(iso: string | Date | null | undefined) {
  if (!iso) return '—';
  const d = typeof iso === 'string' ? new Date(iso) : iso;
  return `${d.getDate()} ${MONTHS[d.getMonth()]} ${d.getFullYear()}`;
}

/** Start dates are calendar dates stored at UTC midnight. */
export function formatStartDate(iso: string) {
  const d = new Date(iso);
  const today = new Date();
  const start = Date.UTC(d.getUTCFullYear(), d.getUTCMonth(), d.getUTCDate());
  const now = Date.UTC(today.getFullYear(), today.getMonth(), today.getDate());
  const diff = Math.round((start - now) / 86_400_000);
  if (diff === 0) return 'Today';
  if (diff === 1) return 'Tomorrow';
  if (diff === -1) return 'Yesterday';
  return `${DAYS[d.getUTCDay()]}, ${d.getUTCDate()} ${MONTHS[d.getUTCMonth()]}`;
}

/** "5m ago", "3h ago", "2d ago", then a date. */
export function timeAgo(iso: string) {
  const seconds = Math.max(0, (Date.now() - new Date(iso).getTime()) / 1000);
  if (seconds < 60) return 'Just now';
  if (seconds < 3600) return `${Math.floor(seconds / 60)}m ago`;
  if (seconds < 86_400) return `${Math.floor(seconds / 3600)}h ago`;
  if (seconds < 7 * 86_400) return `${Math.floor(seconds / 86_400)}d ago`;
  return formatDate(iso);
}

export function daysUntil(iso: string | null | undefined) {
  if (!iso) return 0;
  return Math.max(0, Math.ceil((new Date(iso).getTime() - Date.now()) / 86_400_000));
}

/** Tomorrow as YYYY-MM-DD — the default start date for new work. */
export function tomorrowISO() {
  const d = new Date();
  d.setDate(d.getDate() + 1);
  return toISODate(d);
}

/** YYYY-MM-DD for a local date. */
export function toISODate(d: Date) {
  const m = `${d.getMonth() + 1}`.padStart(2, '0');
  const day = `${d.getDate()}`.padStart(2, '0');
  return `${d.getFullYear()}-${m}-${day}`;
}

/** "Mirpur 10, Dhaka" — adds the division only when it differs from the district name. */
export function place(area: string, district: string, division?: string) {
  return [area, district, division && division !== district ? division : null].filter(Boolean).join(', ');
}

export function capitalize(s: string) {
  return s.replace(/\b\w/g, (c) => c.toUpperCase());
}

export function plural(n: number, word: string, pluralWord = `${word}s`) {
  return `${n} ${n === 1 ? word : pluralWord}`;
}

const STATUS: Record<string, { label: string; tone: Tone; icon?: IconName }> = {
  // approval
  PENDING: { label: 'Pending', tone: 'warning', icon: 'time-outline' },
  APPROVED: { label: 'Approved', tone: 'success', icon: 'checkmark-circle' },
  REJECTED: { label: 'Needs changes', tone: 'danger', icon: 'alert-circle' },
  SUSPENDED: { label: 'Suspended', tone: 'danger', icon: 'ban' },
  // jobs
  PENDING_PAYMENT: { label: 'Awaiting payment', tone: 'warning', icon: 'card-outline' },
  OPEN: { label: 'Open', tone: 'success', icon: 'radio-button-on' },
  FILLED: { label: 'Filled', tone: 'info', icon: 'people' },
  CLOSED: { label: 'Closed', tone: 'neutral', icon: 'lock-closed-outline' },
  REMOVED: { label: 'Removed', tone: 'danger', icon: 'trash-outline' },
  // applications
  APPLIED: { label: 'Applied', tone: 'info', icon: 'paper-plane' },
  SHORTLISTED: { label: 'Shortlisted', tone: 'info', icon: 'bookmark' },
  HIRED: { label: 'Hired', tone: 'success', icon: 'ribbon' },
  WITHDRAWN: { label: 'Withdrawn', tone: 'neutral', icon: 'return-down-back' },
  // hires
  OFFERED: { label: 'Offer sent', tone: 'info', icon: 'mail-unread-outline' },
  ACTIVE: { label: 'Active', tone: 'success', icon: 'flash' },
  COMPLETED: { label: 'Completed', tone: 'primary', icon: 'checkmark-done' },
  DECLINED: { label: 'Declined', tone: 'danger', icon: 'close-circle' },
  CANCELLED: { label: 'Cancelled', tone: 'neutral', icon: 'close-circle-outline' },
  // payments
  SUCCESS: { label: 'Paid', tone: 'success', icon: 'checkmark-circle' },
  FAILED: { label: 'Failed', tone: 'danger', icon: 'close-circle' },
};

export function statusMeta(status: string) {
  return STATUS[status] ?? { label: capitalize(status.toLowerCase().replace(/_/g, ' ')), tone: 'neutral' as Tone };
}

export const providerLabel: Record<PaymentProvider, string> = { SSLCOMMERZ: 'SSLCommerz', STRIPE: 'Stripe' };

/** "Stripe · Visa", "SSLCommerz · BKASH-BKash" */
export function paymentMethodLabel({ provider, method }: { provider: PaymentProvider; method: string | null }) {
  const detail = method && provider === 'STRIPE' ? capitalize(method.replace(/_/g, ' ')) : method;
  return [providerLabel[provider], detail].filter(Boolean).join(' · ');
}

export const purposeLabel: Record<string, string> = {
  WORKER_SUBSCRIPTION: 'Monthly worker plan',
  JOB_POST: 'Job post',
  HIRE: 'Hiring fee',
};
