const EMOJI_AND_JOINER_PATTERN = /[\p{Extended_Pictographic}\uFE0F\u200D]/gu;

export function sanitizeUiText(input: string, fallback = 'unknown'): string {
	const sanitized = input
		.replace(EMOJI_AND_JOINER_PATTERN, '')
		.replace(/\s{2,}/g, ' ')
		.trim();

	return sanitized.length > 0 ? sanitized : fallback;
}

export function safeChannelName(name: string): string {
	return sanitizeUiText(name, 'channel');
}

export function safeGuildName(name: string): string {
	return sanitizeUiText(name, 'server');
}