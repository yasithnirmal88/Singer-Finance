import { describe, expect, it } from 'vitest';
import { formatCount, formatMoney } from './format';

describe('formatMoney', () => {
  it('groups thousands and forces two decimals with the rupee label', () => {
    expect(formatMoney(2629305.35)).toBe('Rs. 2,629,305.35');
  });

  it('renders zero as a currency zero', () => {
    expect(formatMoney(0)).toBe('Rs. 0.00');
  });

  it('drops the currency label when asked', () => {
    expect(formatMoney(100, { withCurrency: false })).toBe('100.00');
  });

  it('allows a custom decimal count', () => {
    expect(formatMoney(1.5, { withCurrency: false, decimals: 3 })).toBe('1.500');
  });

it('shows non-finite values as zero instead of NaN', () => {
    expect(formatMoney(NaN)).toBe('Rs. 0.00');
    expect(formatMoney(Infinity)).toBe('Rs. 0.00');
  });
});

describe('formatCount', () => {
  it('groups thousands', () => {
    expect(formatCount(1234)).toBe('1,234');
  });

  it('shows non-finite values as zero', () => {
    expect(formatCount(NaN)).toBe('0');
  });
});