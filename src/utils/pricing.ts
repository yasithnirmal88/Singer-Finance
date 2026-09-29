import { TERM_RATES } from '../constants';

/**
 * Pricing rules for hire-purchase agreements.
 *
 * Rental is always derived from the cash price and the term's rate, so the
 * monthly figure can never drift from the rate table. The rounding here is the
 * single definition of "a currency amount", used by the sale form, the edit
 * modal and the import path alike.
 */

/** Round to two decimals, avoiding the float error that plain Math.round hits on values like 1.005. */
export const round2 = (value: number): number =>
  Math.round((value + Number.EPSILON) * 100) / 100;

/**
 * The interest rate for a term in months, as a fraction of the cash price.
 * An unknown or missing term has no rate, which is zero.
 */
export const getTermRate = (term: number | undefined | null): number => {
  if (term === undefined || term === null || !Number.isFinite(term)) return 0;
  return TERM_RATES[term] ?? 0;
};

/** Monthly rental for a cash price over a term, rounded to two decimals. */
export const calculateRental = (cashPrice: number, term: number | undefined | null): number =>
  round2(cashPrice * getTermRate(term));

/** Sum an amount list to two decimals, ignoring values that are not finite. */
export const sumMoney = (values: number[]): number =>
  round2(values.reduce((sum, value) => sum + (Number.isFinite(value) ? value : 0), 0));
