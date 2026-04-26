import { describe, expect, it, vi } from 'vitest';
import { executeCommandByName, handleCommand, sendToDMChannel } from '../handlers/commandHandler.js';

function createMockUI() {
  return {
    appendChat: vi.fn(),
    render: vi.fn(),
    clearChat: vi.fn(),
    setChatLabel: vi.fn(),
    setInputLabel: vi.fn(),
    selectSidebar: vi.fn(),
  };
}

describe('commandHandler', () => {
  it('returns false for non-command input', async () => {
    const ui = createMockUI();
    const ctx = {
      client: { guilds: { cache: new Map() }, user: { id: 'bot' } },
      ui,
      channelMap: new Map(),
      getCurrentChannel: () => null,
      setCurrentChannel: vi.fn(),
      getCurrentDMChannel: () => null,
      setCurrentDMChannel: vi.fn(),
      markChannelAsUnread: vi.fn(),
    } as any;

    const result = await handleCommand('hello world', ctx);
    expect(result).toBe(false);
    expect(ui.appendChat).not.toHaveBeenCalled();
  });

  it('handles unknown commands gracefully', async () => {
    const ui = createMockUI();
    const ctx = {
      client: { guilds: { cache: new Map() }, user: { id: 'bot' } },
      ui,
      channelMap: new Map(),
      getCurrentChannel: () => null,
      setCurrentChannel: vi.fn(),
      getCurrentDMChannel: () => null,
      setCurrentDMChannel: vi.fn(),
      markChannelAsUnread: vi.fn(),
    } as any;

    const result = await handleCommand('/unknown', ctx);
    expect(result).toBe(true);
    expect(ui.appendChat).toHaveBeenCalledWith(expect.stringContaining('Unknown command'));
    expect(ui.render).toHaveBeenCalled();
  });

  it('renders member groups and status labels', async () => {
    const ui = createMockUI();
    const onlineUser = { user: { username: 'Alice' }, presence: { status: 'online' } } as any;
    const idleUser = { user: { username: 'Bob' }, presence: { status: 'idle' } } as any;
    const dndUser = { user: { username: 'Carol' }, presence: { status: 'dnd' } } as any;
    const offlineUser = { user: { username: 'Dave' }, presence: { status: 'offline' } } as any;
    const allMembers = [onlineUser, idleUser, dndUser, offlineUser];

    const membersCache = {
      size: allMembers.length,
      filter: (predicate: (member: any) => boolean) => {
        const results = allMembers.filter(predicate);
        return {
          size: results.length,
          forEach: (cb: (member: any) => void) => results.forEach(cb),
        };
      },
    };

    const currentChannel = {
      guild: {
        members: {
          cache: membersCache,
        },
      },
    } as any;

    const ctx = {
      client: { guilds: { cache: new Map() }, user: { id: 'bot' } },
      ui,
      channelMap: new Map(),
      getCurrentChannel: () => currentChannel,
      setCurrentChannel: vi.fn(),
      getCurrentDMChannel: () => null,
      setCurrentDMChannel: vi.fn(),
      markChannelAsUnread: vi.fn(),
    } as any;

    const result = await executeCommandByName('members', [], ctx);
    expect(result).toBe(true);
    expect(ui.appendChat).toHaveBeenCalledWith(expect.stringContaining('Members'));
    expect(ui.appendChat).toHaveBeenCalledWith(expect.stringContaining('Online'));
    expect(ui.appendChat).toHaveBeenCalledWith(expect.stringContaining('Idle'));
    expect(ui.appendChat).toHaveBeenCalledWith(expect.stringContaining('DND'));
    expect(ui.appendChat).toHaveBeenCalledWith(expect.stringContaining('Offline'));
  });

  it('logs sent DM content on success', async () => {
    const ui = createMockUI();
    const dmChannel = {
      send: vi.fn(async () => ({ id: 'sent' })),
    } as any;

    await sendToDMChannel(dmChannel, 'hello', ui as any, { user: { id: 'bot' } } as any);
    expect(dmChannel.send).toHaveBeenCalledWith('hello');
    expect(ui.appendChat).toHaveBeenCalledWith(expect.stringContaining('You')); 
    expect(ui.appendChat).toHaveBeenCalledWith(expect.stringContaining('hello'));
  });

  it('reports a DM send failure', async () => {
    const ui = createMockUI();
    const dmChannel = {
      send: vi.fn(async () => { throw new Error('network'); }),
    } as any;

    await sendToDMChannel(dmChannel, 'hello', ui as any, { user: { id: 'bot' } } as any);
    expect(ui.appendChat).toHaveBeenCalledWith(expect.stringContaining('Failed to send')); 
  });
});