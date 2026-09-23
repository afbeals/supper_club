import { describe, expect, it } from 'vitest';
import { normalizeRating, overallScore } from '../scoring';

describe('normalizeRating', () => {
  it('maps the minimum value to 0 when higher is better', () => {
    expect(normalizeRating({ value: 1, minValue: 1, maxValue: 10, higherIsBetter: true })).toBe(0);
  });

  it('maps the maximum value to 100 when higher is better', () => {
    expect(normalizeRating({ value: 10, minValue: 1, maxValue: 10, higherIsBetter: true })).toBe(100);
  });

  it('inverts the scale when higher is better is false', () => {
    expect(normalizeRating({ value: 1, minValue: 1, maxValue: 10, higherIsBetter: false })).toBe(100);
    expect(normalizeRating({ value: 10, minValue: 1, maxValue: 10, higherIsBetter: false })).toBe(0);
  });

  it('clamps out-of-range values instead of producing a score outside 0-100', () => {
    expect(normalizeRating({ value: 999, minValue: 1, maxValue: 10, higherIsBetter: true })).toBe(100);
    expect(normalizeRating({ value: -5, minValue: 1, maxValue: 10, higherIsBetter: true })).toBe(0);
  });

  it('returns 50 for a degenerate min===max range instead of dividing by zero', () => {
    expect(normalizeRating({ value: 5, minValue: 5, maxValue: 5, higherIsBetter: true })).toBe(50);
  });
});

describe('overallScore', () => {
  it('returns null for an empty rating list', () => {
    expect(overallScore([])).toBeNull();
  });

  it('averages normalized scores weighted by criterion weight', () => {
    const score = overallScore([
      { value: 10, minValue: 1, maxValue: 10, higherIsBetter: true, weight: 1 }, // normalized 100
      { value: 1, minValue: 1, maxValue: 10, higherIsBetter: true, weight: 1 }, // normalized 0
    ]);
    expect(score).toBe(50);
  });

  it('weights a heavier criterion more than a lighter one', () => {
    const score = overallScore([
      { value: 10, minValue: 1, maxValue: 10, higherIsBetter: true, weight: 3 }, // normalized 100
      { value: 1, minValue: 1, maxValue: 10, higherIsBetter: true, weight: 1 }, // normalized 0
    ]);
    // (100*3 + 0*1) / 4 = 75
    expect(score).toBe(75);
  });

  it('returns null when every weight is zero, rather than dividing by zero', () => {
    expect(overallScore([{ value: 10, minValue: 1, maxValue: 10, higherIsBetter: true, weight: 0 }])).toBeNull();
  });
});
