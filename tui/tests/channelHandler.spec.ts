import { describe, expect, it, vi, beforeEach } from 'vitest';

vi.mock('../utils/messageRenderer.js', () => ({
  renderMessage: vi.fn(async () => undefined),
}));

import { handleChannelSelect } from '../handlers/channelHandler.js';
import { renderMessage } from '../utils/messageRenderer.js';

describe('channelHandler', () => {
  let ui: any;

  beforeEach(() => {
    ui = {
      showChatUI: vi.fn(),
      setChatLabel: vi.fn(),
      setInputLabel: vi.fn(),
      setTitleBar: vi.fn(),
      appendChat: vi.fn(),
      clearChat: vi.fn(),
      setChatContent: vi.fn(),
      setStatusBar: vi.fn(),
      clearInput: vi.fn(),
      hardRefresh: vi.fn(),
      render: vi.fn(),
    };
    (renderMessage as any).mockClear();
  });

  it('loads channel and renders messages successfully', async () => {
    const channel = {
      name: 'general',
      guild: { name: 'My Server' },
      messages: {
        fetch: vi.fn(async () => new Map([['1', { author: { id: '1' }, createdTimestamp: 1672531200000, content: 'Hi', mentions: { users: new Map() }, attachments: new Map() }]])),
      },
    } as any;

    await handleChannelSelect(channel, ui, { id: 'bot' } as any);

    expect(ui.setTitleBar).toHaveBeenCalledWith('My Server', 'general', 'connected');
    expect(ui.setStatusBar).toHaveBeenCalledWith(expect.stringContaining('Connected to #general'));
    expect(ui.clearChat).toHaveBeenCalled();
    expect(ui.render).toHaveBeenCalled();
    expect(renderMessage).toHaveBeenCalled();
  });

  it('handles channel load failure by displaying disconnected status', async () => {
    const channel = {
      name: 'general',
      guild: { name: 'My Server' },
      messages: {
        fetch: vi.fn(async () => { throw new Error('fail'); }),
      },
    } as any;

    await handleChannelSelect(channel, ui, null);

    expect(ui.setTitleBar).toHaveBeenCalledWith('My Server', 'general', 'disconnected');
    expect(ui.appendChat).toHaveBeenCalledWith(expect.stringContaining('Failed to load messages'));
    expect(ui.render).toHaveBeenCalled();
  });
});