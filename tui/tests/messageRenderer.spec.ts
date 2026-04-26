import { describe, expect, it, vi } from 'vitest';
import { renderMessage } from '../utils/messageRenderer.js';
import type { UIBridge } from '../ui/types.js';

vi.mock('../utils/imageRenderer.js', () => ({
  displayImage: vi.fn(async () => null),
}));

function createMockUI() {
  return {
    appendChat: vi.fn(),
  };
}

describe('messageRenderer', () => {
  it('renders content and highlights current user mentions', async () => {
    const ui = createMockUI();
    const message = {
      author: { id: '2', username: 'Bob', bot: false },
      createdTimestamp: 1672531200000,
      content: 'Hello <@2>',
      mentions: {
        users: new Map([['2', { id: '2', username: 'Bob' }]]),
      },
      attachments: new Map(),
    } as any;

    await renderMessage(message, ui, false, { id: '2' } as any, null, null);

    expect(ui.appendChat).toHaveBeenCalled();
    expect(ui.appendChat.mock.calls.some((call: any[]) => String(call[0]).includes('Bob'))).toBe(true);
    expect(ui.appendChat.mock.calls.some((call: any[]) => String(call[0]).includes('@Bob'))).toBe(true);
  });

  it('appends deleted message status when content is missing', async () => {
    const ui = createMockUI();
    const message = {
      author: { id: '1', username: 'Alice', bot: false },
      createdTimestamp: 1672531200000,
      content: '',
      mentions: { users: new Map() },
      attachments: new Map(),
    } as any;

    await renderMessage(message, ui, false, null, null, null);

    expect(ui.appendChat).toHaveBeenCalledWith(expect.stringContaining('(message deleted)'));
  });

  it('appends image preview fallback when image preview is unavailable', async () => {
    const ui = createMockUI();
    const message = {
      author: { id: '1', username: 'Alice', bot: false },
      createdTimestamp: 1672531200000,
      content: 'Picture',
      mentions: { users: new Map() },
      attachments: new Map([['a', { url: 'https://example.com/image.png', contentType: 'image/png' }]]),
    } as any;

    await renderMessage(message, ui, true, null, null, null);

    expect(ui.appendChat).toHaveBeenCalledWith(expect.stringContaining('[Image preview unavailable in this terminal]'));
  });
});