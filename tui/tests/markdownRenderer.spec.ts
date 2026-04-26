import { describe, expect, it } from 'vitest';
import { renderDiscordMarkdown } from '../utils/markdownRenderer.js';

describe('renderDiscordMarkdown', () => {
  it('renders bold, underline, spoiler, and links', () => {
    const source = '**bold** __underline__ ||spoiler|| [link](https://example.com)';
    const output = renderDiscordMarkdown(source);

    expect(output).toContain('bold');
    expect(output).toContain('underline');
    expect(output).toContain('spoiler');
    expect(output).toContain('link');
    expect(output).toContain('https://example.com');
    expect(output.endsWith('\n')).toBe(false);
  });

  it('preserves Markdown list formatting', () => {
    const source = '- item 1\n- item 2';
    const output = renderDiscordMarkdown(source);

    expect(output).toContain('• item 1');
    expect(output).toContain('• item 2');
  });
});