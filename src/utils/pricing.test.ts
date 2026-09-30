import { describe, expect, it } from 'vitest';
import { calculateRental, getTermRate, round2, sumMoney } from './pricing';

describe('round2', () => {
  it('avoids the float error Math.round hits on 1.005', () => {
    expect(round2(1.005)).toBe(1.01);
  });

  it('rounds float sums to cents', () => {
    expect(round2(0.1 + 0.2)).toBe(0.3);
  });
});

describe('getTermRate', () => {
  it('returns the rate for a known term', () => {
    expect(getTermRate(6)).toBe(0.18562);
    expect(getTermRate(12)).toBe(0.10146);
    expect(getTermRate(18)).toBe(0.07374);
    expect(getTermRate(24)).toBe(0.06011);
  });

  it('is zero for an unknown, missing or non-finite term', () => {
    expect(getTermRate(7)).toBe(0);
    expect(getTermRate(undefined)).toBe(0);
    expect(getTermRate(null)).toBe(0);
    expect(getTermRate(NaN)).toBe(0);
  });
});

describe('calculateRental', () => {
  it('derives the monthly rental from cash price and term rate', () => {
    expect(calculateRental(85000, 12)).toBe(8624.1);
    expect(calculateRental(45000, 12)).toBe(4565.7);
  });
});

describe('sumMoney', () => {
  it('sums to two decimals, skipping non-finite values', () => {
    expect(sumMoney([100, 250.5, NaN, Infinity])).toBe(350.5);
  });
});