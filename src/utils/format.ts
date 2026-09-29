/**
 * Display formatting for money and counts.
 *
 * Every screen that shows an amount should go through here so a lakh and a
 * paisa look the same in the item table, the sale form and the summary panel.
 */

/** Options for {@link formatMoney}. */
export interface FormatMoneyOptions {
  /** Prefix the amount with the rupee label. Defaults to true. */
  withCurrency?: boolean;
  /** Force a fixed number of decimals. Defaults to 2. */
  decimals?: number;
}

/**
 * Format an amount as `Rs. 2,629,305.35`: grouped thousands and two decimals.
 *
 * Values that are not finite (NaN, Infinity, undefined slipping through a
 * Firestore field) are shown as zero rather than as "NaN" in the UI.
 */
export const formatMoney = (value: number, options: FormatMoneyOptions = {}): string => {
  const { withCurrency = true, decimals = 2 } = options;
  const safe = Number.isFinite(value) ? value : 0;
  const amount = safe.toLocaleString('en-US', {
    minimumFractionDigits: decimals,
    maximumFractionDigits: decimals,
  });
  return withCurrency ? `Rs. ${amount}` : amount;
};

/** Format a count with grouped thousands, e.g. `1,234`. */
export const formatCount = (value: number): string => {
  const safe = Number.isFinite(value) ? value : 0;
  return safe.toLocaleString('en-US');
};
