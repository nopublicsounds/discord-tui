import { createWriteStream } from 'node:fs';
import { mkdir } from 'node:fs/promises';
import { basename, dirname, resolve } from 'node:path';
import { pipeline } from 'node:stream/promises';
import { spawn } from 'node:child_process';
import type { Message } from 'discord.js';
import got from 'got';

const MAX_RECENT_ATTACHMENTS = 30;

export type RecentAttachment = {
	url: string;
	name: string;
	contentType: string | null;
	size: number | null;
	messageId: string;
	channelId: string;
	timestamp: number;
};

const recentAttachmentsByChannel = new Map<string, RecentAttachment[]>();

function fallbackNameFromUrl(url: string): string {
	try {
		const pathname = new URL(url).pathname;
		const file = basename(pathname);
		return file || 'attachment.bin';
	}
	catch {
		return 'attachment.bin';
	}
}

function sanitizeFilename(name: string): string {
	const cleaned = name.replace(/[^a-zA-Z0-9._-]/g, '_');
	return cleaned.length > 0 ? cleaned : 'attachment.bin';
}

export function clearRecentAttachments(): void {
	recentAttachmentsByChannel.clear();
}

export function listRecentAttachmentsForChannel(channelId: string): RecentAttachment[] {
	return [...(recentAttachmentsByChannel.get(channelId) ?? [])];
}

export function registerMessageAttachments(message: Message): void {
	if (!message.attachments || message.attachments.size === 0) {
		return;
	}
	const channelId = message.channelId;
	if (!channelId) {
		return;
	}
	const existing = recentAttachmentsByChannel.get(channelId) ?? [];

	for (const attachment of message.attachments.values()) {
		if (!attachment.url) {
			continue;
		}
		existing.unshift({
			url: attachment.url,
			name: sanitizeFilename(attachment.name || fallbackNameFromUrl(attachment.url)),
			contentType: attachment.contentType ?? null,
			size: typeof attachment.size === 'number' ? attachment.size : null,
			messageId: message.id,
			channelId,
			timestamp: message.createdTimestamp,
		});
	}

	if (existing.length > MAX_RECENT_ATTACHMENTS) {
		existing.length = MAX_RECENT_ATTACHMENTS;
	}

	recentAttachmentsByChannel.set(channelId, existing);
}

function getAttachmentByIndex(channelId: string, index: number): RecentAttachment {
	const channelAttachments = recentAttachmentsByChannel.get(channelId) ?? [];
	if (!Number.isInteger(index) || index < 0 || index >= channelAttachments.length) {
		throw new Error('Attachment index out of range');
	}
	return channelAttachments[index] as RecentAttachment;
}

export async function openRecentAttachmentForChannel(channelId: string, index: number): Promise<void> {
	const attachment = getAttachmentByIndex(channelId, index);
	const commands = [process.env.BROWSER, 'xdg-open'].filter((value): value is string => Boolean(value));
	let lastError: Error | null = null;

	for (const command of commands) {
		try {
			const child = spawn(command, [attachment.url], {
				stdio: 'ignore',
				detached: true,
			});

			await new Promise<void>((resolvePromise, rejectPromise) => {
				child.once('spawn', () => resolvePromise());
				child.once('error', (error) => rejectPromise(error));
			});

			child.unref();
			return;
		}
		catch (error) {
			lastError = error as Error;
		}
	}

	throw lastError ?? new Error('No browser opener is available');
}

export async function downloadRecentAttachmentForChannel(
	channelId: string,
	index: number,
	outputPath?: string
): Promise<string> {
	const attachment = getAttachmentByIndex(channelId, index);
	const destinationPath = outputPath
		? resolve(outputPath)
		: resolve('downloads', `${Date.now()}-${attachment.name}`);
	const destinationDir = dirname(destinationPath);

	await mkdir(destinationDir, { recursive: true });
	await pipeline(got.stream(attachment.url), createWriteStream(destinationPath));
	return destinationPath;
}
