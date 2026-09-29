/** Interest rate as a fraction of the cash price, keyed by term in months. */
export const TERM_RATES: Record<number, number> = {
  6: 0.18562,
  12: 0.10146,
  18: 0.07374,
  24: 0.06011,
};

/** The terms offered on a hire-purchase agreement, for the term selector. */
export const TERM_OPTIONS = [
  { value: 6, label: '6 Months' },
  { value: 12, label: '12 Months' },
  { value: 18, label: '18 Months' },
  { value: 24, label: '24 Months' },
];
