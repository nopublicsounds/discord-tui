import { describe, expect, it } from 'vitest';
import { formatTime, formatDate, renderDateSeparator } from '../utils/formatters.js';

function stripAnsi(text: string): string {
  return text.replace(/\x1B\[[0-?]*[ -/]*[@-~]/g, '');
}

describe('formatters', () => {
  it('formats time as HH:mm:ss', () => {
    const time = formatTime(1672531200000);
    expect(/^[0-9]{2}:[0-9]{2}:[0-9]{2}$/.test(time)).toBe(true);
  });

  it('formats date with year and weekday', () => {
    const date = formatDate(1672531200000);
    expect(date).toContain('2023');
    expect(date.length).toBeGreaterThan(0);
  });

  it('renders a date separator with decorative lines', () => {
    const timestamp = 1672531200000;
    const separator = renderDateSeparator(timestamp, 40);
    const plain = stripAnsi(separator);

    expect(plain).toContain(formatDate(timestamp));
    expect(plain).toMatch(/^─+/);
    expect(plain.length).toBeGreaterThan(0);
  });
});