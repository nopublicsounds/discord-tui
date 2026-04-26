import { describe, expect, it } from 'vitest';
import { sanitizeUiText, safeChannelName, safeGuildName } from '../utils/uiText.js';

describe('uiText utils', () => {
  it('removes emoji characters and trims whitespace', () => {
    const value = '  Hello 🌟 world  ';
    expect(sanitizeUiText(value)).toBe('Hello world');
  });

  it('collapses multiple spaces into one', () => {
    const value = 'Line   with    many spaces';
    expect(sanitizeUiText(value)).toBe('Line with many spaces');
  });

  it('returns fallback for empty sanitized channel names', () => {
    expect(safeChannelName('   ')).toBe('channel');
  });

  it('returns fallback for empty sanitized guild names', () => {
    expect(safeGuildName('   ')).toBe('server');
  });
});