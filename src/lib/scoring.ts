export interface RatingForScoring {
  value: number;
  minValue: number;
  maxValue: number;
  higherIsBetter: boolean;
  weight: number;
}

/** Normalize one rating to 0-100 across its own min..max, inverted when higherIsBetter is false. */
export function normalizeRating(rating: Pick<RatingForScoring, 'value' | 'minValue' | 'maxValue' | 'higherIsBetter'>): number {
  const { value, minValue, maxValue, higherIsBetter } = rating;
  if (maxValue === minValue) return 50; // degenerate range; avoid a divide-by-zero
  const clamped = Math.min(Math.max(value, minValue), maxValue);
  const fraction = (clamped - minValue) / (maxValue - minValue);
  const normalized = higherIsBetter ? fraction : 1 - fraction;
  return Math.round(normalized * 100);
}

/** Weighted mean of normalized (0-100) scores. Null when there's nothing to average. */
export function overallScore(ratings: RatingForScoring[]): number | null {
  if (ratings.length === 0) return null;
  let weightedSum = 0;
  let weightTotal = 0;
  for (const rating of ratings) {
    weightedSum += normalizeRating(rating) * rating.weight;
    weightTotal += rating.weight;
  }
  if (weightTotal === 0) return null;
  return Math.round(weightedSum / weightTotal);
}
