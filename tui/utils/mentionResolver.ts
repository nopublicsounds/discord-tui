import { GuildMember, TextChannel } from 'discord.js';

const MENTION_TOKEN_REGEX = /(^|\s)@([^\s@<]+?)(?=[\s@<.,:;!?]|$)/g;
const RESERVED_MENTIONS = new Set(['everyone', 'here']);

function normalize(value: string): string {
	return value.trim().toLowerCase();
}

function memberMatchesToken(member: GuildMember, token: string): boolean {
	const normalizedToken = normalize(token);
	const username = normalize(member.user.username);
	const displayName = normalize(member.displayName);
	const globalName = normalize(member.user.globalName ?? '');

	return username === normalizedToken
		|| displayName === normalizedToken
		|| globalName === normalizedToken;
}

function findUniqueMemberInCollection(members: Iterable<GuildMember>, token: string): GuildMember | null {
	const matches: GuildMember[] = [];
	for (const member of members) {
		if (memberMatchesToken(member, token)) {
			matches.push(member);
		}
	}

	return matches.length === 1 ? (matches[0] ?? null) : null;
}

async function resolveTokenToMember(channel: TextChannel, token: string): Promise<GuildMember | null> {
	const fromCache = findUniqueMemberInCollection(channel.guild.members.cache.values(), token);
	if (fromCache) {
		return fromCache;
	}

	try {
		const fetched = await channel.guild.members.fetch({ query: token, limit: 10 });
		return findUniqueMemberInCollection(fetched.values(), token);
	}
	catch {
		return null;
	}
}

export async function resolveMentionsForSend(channel: TextChannel, input: string): Promise<string> {
	if (!input.includes('@')) {
		return input;
	}

	const tokens = new Set<string>();
	let tokenMatch = MENTION_TOKEN_REGEX.exec(input);
	while (tokenMatch !== null) {
		const token = tokenMatch[2];
		if (token && !RESERVED_MENTIONS.has(normalize(token))) {
			tokens.add(token);
		}
		tokenMatch = MENTION_TOKEN_REGEX.exec(input);
	}

	if (tokens.size === 0) {
		return input;
	}

	const resolvedMentions = new Map<string, string>();
	for (const token of tokens) {
		const member = await resolveTokenToMember(channel, token);
		if (member) {
			resolvedMentions.set(token, `<@${member.id}>`);
		}
	}

	if (resolvedMentions.size === 0) {
		return input;
	}

	return input.replace(MENTION_TOKEN_REGEX, (full: string, prefix: string, token: string) => {
		const replacement = resolvedMentions.get(token);
		if (!replacement) {
			return full;
		}
		return `${prefix}${replacement}`;
	});
}
