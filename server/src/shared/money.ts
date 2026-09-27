/**
 * Money is stored in the currency's minor unit (poisha, cents…). Most currencies have 2
 * decimals; Stripe lists these as zero-decimal (1 unit = 1 minor unit).
 */
const ZERO_DECIMAL = new Set(["bif", "clp", "djf", "gnf", "jpy", "kmf", "krw", "mga", "pyg", "rwf", "ugx", "vnd", "vuv", "xaf", "xof", "xpf"]);

export const minorUnitFactor = (currency: string) => (ZERO_DECIMAL.has(currency.toLowerCase()) ? 1 : 100);

/** 12.5 USD → 1250 */
export const toMinor = (amount: number, currency: string) => Math.round(amount * minorUnitFactor(currency));

/** 1250 USD → 12.5 */
export const toMajor = (minor: number, currency: string) => minor / minorUnitFactor(currency);
