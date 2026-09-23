import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';
import { formatDate, relativeTime } from '../format';

describe('formatDate', () => {
  it('formats a date as "Mon D, YYYY"', () => {
    expect(formatDate(new Date(2026, 0, 15))).toBe('Jan 15, 2026');
  });

  it('returns an em dash for null', () => {
    expect(formatDate(null)).toBe('—');
  });
});

describe('relativeTime', () => {
  const now = new Date(2026, 0, 15, 12, 0, 0);

  beforeEach(() => {
    vi.useFakeTimers();
    vi.setSystemTime(now);
  });

  afterEach(() => {
    vi.useRealTimers();
  });

  it('says "just now" for under a minute', () => {
    expect(relativeTime(new Date(now.getTime() - 30 * 1000))).toBe('just now');
  });

  it('shows minutes ago for under an hour', () => {
    expect(relativeTime(new Date(now.getTime() - 5 * 60 * 1000))).toBe('5m ago');
  });

  it('shows hours ago for under a day', () => {
    expect(relativeTime(new Date(now.getTime() - 3 * 3600 * 1000))).toBe('3h ago');
  });

  it('shows days ago for under 30 days', () => {
    expect(relativeTime(new Date(now.getTime() - 4 * 86400 * 1000))).toBe('4d ago');
  });

  it('falls back to formatDate at 30 days and beyond', () => {
    expect(relativeTime(new Date(now.getTime() - 31 * 86400 * 1000))).toBe(formatDate(new Date(now.getTime() - 31 * 86400 * 1000)));
  });
});
