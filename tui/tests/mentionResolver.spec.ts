import { describe, expect, it, vi } from 'vitest';
import { resolveMentionsForSend } from '../utils/mentionResolver.js';

function makeMember(id: string, username: string, displayName: string, globalName: string) {
  return {
    id,
    user: { username, globalName },
    displayName,
  } as any;
}

describe('resolveMentionsForSend', () => {
  it('resolves a known mention from cache', async () => {
    const member = makeMember('1', 'alice', 'Alice', 'Ali');
    const channel = {
      guild: {
        members: {
          cache: new Map([[member.id, member]]),
          fetch: vi.fn(async () => new Map()),
        },
      },
    } as any;

    const result = await resolveMentionsForSend(channel, 'Hello @alice, welcome!');
    expect(result).toBe('Hello <@1>, welcome!');
    expect(channel.guild.members.fetch).not.toHaveBeenCalled();
  });

  it('leaves unknown mentions unchanged', async () => {
    const channel = {
      guild: {
        members: {
          cache: new Map(),
          fetch: vi.fn(async () => new Map()),
        },
      },
    } as any;

    const result = await resolveMentionsForSend(channel, 'Hello @unknown');
    expect(result).toBe('Hello @unknown');
  });

  it('does not resolve reserved mentions', async () => {
    const channel = {
      guild: {
        members: {
          cache: new Map(),
          fetch: vi.fn(async () => new Map()),
        },
      },
    } as any;

    const result = await resolveMentionsForSend(channel, 'Hello @everyone and @here');
    expect(result).toBe('Hello @everyone and @here');
  });
});