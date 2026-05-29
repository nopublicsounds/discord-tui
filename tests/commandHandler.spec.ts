import { describe, expect, it, vi } from 'vitest';
import { executeCommandByName, handleCommand, sendToDMChannel } from '../tui/handlers/commandHandler.js';
import {
  downloadRecentAttachmentForChannel,
  listRecentAttachmentsForChannel,
  openRecentAttachmentForChannel,
} from '../tui/utils/attachmentActions.js';

vi.mock('../tui/utils/attachmentActions.js', () => ({
  listRecentAttachmentsForChannel: vi.fn(() => []),
  openRecentAttachmentForChannel: vi.fn(async () => undefined),
  downloadRecentAttachmentForChannel: vi.fn(async () => '/tmp/file.bin'),
}));

function createMockUI() {
  return {
    appendChat: vi.fn(),
    render: vi.fn(),
    clearChat: vi.fn(),
    setChatLabel: vi.fn(),
    setInputLabel: vi.fn(),
    selectSidebar: vi.fn(),
    showAttachmentModal: vi.fn(),
    hideAttachmentModal: vi.fn(),
    isAttachmentModalVisible: vi.fn(() => false),
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

  it('lists recent attachments with /attachments', async () => {
    vi.mocked(listRecentAttachmentsForChannel).mockReturnValue([
      {
        url: 'https://example.com/a.pdf',
        name: 'a.pdf',
        contentType: 'application/pdf',
        size: 1024,
        messageId: 'm1',
        channelId: 'c1',
        timestamp: 1,
      },
    ] as any);

    const ui = createMockUI();
    const ctx = {
      client: { guilds: { cache: new Map() }, user: { id: 'bot' } },
      ui,
      channelMap: new Map(),
      getCurrentChannel: () => ({ id: 'c1' }),
      setCurrentChannel: vi.fn(),
      getCurrentDMChannel: () => null,
      setCurrentDMChannel: vi.fn(),
      markChannelAsUnread: vi.fn(),
    } as any;

    const result = await executeCommandByName('attachments', [], ctx);
    expect(result).toBe(true);
    expect(ui.showAttachmentModal).toHaveBeenCalledWith(
      expect.stringContaining('Attachments'),
      expect.arrayContaining([expect.stringContaining('1. a.pdf')])
    );
  });

  it('opens an attachment by index', async () => {
    const ui = createMockUI();
    const ctx = {
      client: { guilds: { cache: new Map() }, user: { id: 'bot' } },
      ui,
      channelMap: new Map(),
      getCurrentChannel: () => ({ id: 'c1' }),
      setCurrentChannel: vi.fn(),
      getCurrentDMChannel: () => null,
      setCurrentDMChannel: vi.fn(),
      markChannelAsUnread: vi.fn(),
    } as any;

    const result = await executeCommandByName('open', ['1'], ctx);
    expect(result).toBe(true);
    expect(openRecentAttachmentForChannel).toHaveBeenCalledWith('c1', 0);
    expect(ui.appendChat).toHaveBeenCalledWith(expect.stringContaining('Opened attachment #1'));
  });

  it('downloads an attachment by index', async () => {
    const ui = createMockUI();
    const ctx = {
      client: { guilds: { cache: new Map() }, user: { id: 'bot' } },
      ui,
      channelMap: new Map(),
      getCurrentChannel: () => ({ id: 'c1' }),
      setCurrentChannel: vi.fn(),
      getCurrentDMChannel: () => null,
      setCurrentDMChannel: vi.fn(),
      markChannelAsUnread: vi.fn(),
    } as any;

    const result = await executeCommandByName('download', ['1', '/tmp', 'saved.bin'], ctx);
    expect(result).toBe(true);
    expect(downloadRecentAttachmentForChannel).toHaveBeenCalledWith('c1', 0, '/tmp saved.bin');
    expect(ui.appendChat).toHaveBeenCalledWith(expect.stringContaining('Saved attachment to'));
  });
});