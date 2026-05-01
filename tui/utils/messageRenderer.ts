import chalk from 'chalk';
import { Embed, Message, MessageType, User } from 'discord.js';
import { formatTime } from './formatters.js';
import { displayImage } from './imageRenderer.js';
import { renderDiscordMarkdown } from './markdownRenderer.js';
import type { UIBridge } from '../ui/types.js';

const GROUP_WINDOW_MS = 3 * 60 * 1000;

function formatAuthorLabel(message: Message, currentUser: User | null): string {
	if(currentUser && message.author.id === currentUser.id){
		return chalk.green('You');
	}

	return message.author.bot
		? chalk.magenta(message.author.username)
		: chalk.cyan(message.author.username);
}

function highlightMentions(content: string, message: Message, currentUser: User | null): string {
	let result = content;

	message.mentions.users.forEach((user) => {
		const pattern = new RegExp(`<@!?${user.id}>`, 'g');
		const isCurrentUser = currentUser && user.id === currentUser.id;
		const display = isCurrentUser
			? chalk.bgHex('#F0B232').black(` @${user.username} `)
			: chalk.bgHex('#5865F2').hex('#FFFFFF')(` @${user.username} `);
		result = result.replace(pattern, display);
	});

	return result;
}

function getSystemMessageText(message: Message): string | null {
	if (message.type === MessageType.UserJoin) {
		const username = chalk.whiteBright(message.author?.username ?? 'Someone');
		return `${chalk.hex('#43B581')('➕')} ${username} ${chalk.hex('#B9BBBE')('joined the server')}`;
	}

	return null;
}

function hasRenderableContent(message: Message): boolean {
	const hasText = Boolean(message.content && message.content.trim().length > 0);
	const hasAttachments = message.attachments?.size > 0;
	const hasEmbeds = message.embeds?.length > 0;
	const hasSystemMessage = Boolean(getSystemMessageText(message));
	return hasText || hasAttachments || hasEmbeds || hasSystemMessage;
}

function toEmbedColor(color: number | null | undefined): string {
	return color ? `#${color.toString(16).padStart(6, '0')}` : '#4F545C';
}

function hasEmbedContent(embed: Embed, showImages: boolean): boolean {
	return Boolean(
		embed.title ||
		embed.description ||
		embed.author?.name ||
		embed.fields?.length ||
		embed.footer?.text ||
		embed.timestamp ||
		embed.provider?.name ||
		embed.video?.url ||
		(showImages && (embed.thumbnail?.url || embed.image?.url))
	);
}

function renderEmbedLine(ui: Pick<UIBridge, 'appendChat'>, prefix: string, text: string): void {
	ui.appendChat(`${prefix} ${text}`);
}

function renderEmbedLines(ui: Pick<UIBridge, 'appendChat'>, prefix: string, content: string): void {
	content.split('\n').forEach((line) => {
		renderEmbedLine(ui, prefix, line);
	});
}

async function renderEmbed(embed: Embed, ui: Pick<UIBridge, 'appendChat'>, showImages: boolean): Promise<void> {
	if (!hasEmbedContent(embed, showImages)) return;

	const borderColor = toEmbedColor(embed.color);
	const border = chalk.hex(borderColor)('┃');
	const prefix = `${border} `;
	let hasPreviousContent = false;

	ui.appendChat(chalk.hex(borderColor)('┏━━'));

	const addSpacing = () => {
		if (hasPreviousContent) {
			ui.appendChat(border);
		}
	};

	if (embed.provider?.name) {
		const providerText = embed.provider.url
			? `${embed.provider.name} ${chalk.dim(embed.provider.url)}`
			: embed.provider.name;
		renderEmbedLine(ui, prefix, chalk.dim(providerText));
		hasPreviousContent = true;
	}

	if (embed.author?.name) {
		addSpacing();
		const authorText = embed.author.url
			? `${embed.author.name} ${chalk.underline(chalk.hex('#00AFF4')(embed.author.url))}`
			: embed.author.name;
		renderEmbedLine(ui, prefix, chalk.hex('#B9BBBE').bold(authorText));
		hasPreviousContent = true;
	}

	if (embed.title) {
		addSpacing();
		const titleText = embed.url
			? `${chalk.bold(embed.title)} ${chalk.underline(chalk.hex('#00AFF4')(embed.url))}`
			: chalk.bold(embed.title);
		renderEmbedLine(ui, prefix, titleText);
		hasPreviousContent = true;
	}

	if (showImages && embed.thumbnail?.url) {
		addSpacing();
		try {
			const preview = await displayImage(embed.thumbnail.url);
			if (preview) {
				renderEmbedLines(ui, prefix, preview);
				hasPreviousContent = true;
			}
		} catch (e) {}
	}

	if (embed.description) {
		addSpacing();
		renderEmbedLines(ui, prefix, renderDiscordMarkdown(embed.description));
		hasPreviousContent = true;
	}

	if (embed.fields?.length) {
		const pending: typeof embed.fields[number][] = [];
		const flushPending = () => {
			for (const f of pending) {
				addSpacing();
				renderEmbedLine(ui, prefix, chalk.bold(f.name));
				renderEmbedLines(ui, prefix, renderDiscordMarkdown(f.value));
				hasPreviousContent = true;
			}
			pending.length = 0;
		};

		for (const field of embed.fields) {
			if (field.inline) {
				pending.push(field);
				if (pending.length === 3) flushPending();
			} else {
				flushPending();
				addSpacing();
				renderEmbedLine(ui, prefix, chalk.bold(field.name));
				renderEmbedLines(ui, prefix, renderDiscordMarkdown(field.value));
				hasPreviousContent = true;
			}
		}
		flushPending();
	}

	if (showImages && embed.image?.url) {
		addSpacing();
		try {
			const preview = await displayImage(embed.image.url);
			if (preview) {
				renderEmbedLines(ui, prefix, preview);
				hasPreviousContent = true;
			}
		} catch (e) {}
	}

	if (embed.video?.url) {
		addSpacing();
		renderEmbedLine(ui, prefix, `${chalk.hex('#B9BBBE')('Video:')} ${chalk.hex('#00AFF4').underline(embed.video.url)}`);
		hasPreviousContent = true;
	}

	if (embed.footer?.text || embed.timestamp) {
		addSpacing();
		const footerParts: string[] = [];
		if (embed.footer?.text) footerParts.push(embed.footer.text);
		if (embed.timestamp) footerParts.push(formatTime(new Date(embed.timestamp).getTime()));
		renderEmbedLine(ui, prefix, chalk.dim(footerParts.join(' • ')));
		hasPreviousContent = true;
	}

	ui.appendChat(chalk.hex(borderColor)('┗━━'));
}

function getMessageStatus(message: Message): string {
	const status: string[] = [];
	if (!hasRenderableContent(message)) {
		status.push(chalk.red('(message deleted)'));
	}

	else if (message.editedTimestamp) {
		status.push(chalk.dim('(edited)'));
	}
	
	return status.length > 0 ? ' ' + status.join(' ') : '';
}

export async function renderMessage(
	message: Message, 
	ui: Pick<UIBridge, 'appendChat'>,
	showImages: boolean = false, 
	currentUser: User | null = null,
	lastAuthorId: string | null = null,
	lastMessageTimestamp: number | null = null
): Promise<void> {
	const time = formatTime(message.createdTimestamp);
	const author = formatAuthorLabel(message, currentUser);
	const timestamp = chalk.gray(`[${time}]`);
	const systemText = getSystemMessageText(message);
	const timeDelta =
		lastMessageTimestamp === null
			? Number.POSITIVE_INFINITY
			: message.createdTimestamp - lastMessageTimestamp;
	const isGrouped =
		!systemText &&
		lastAuthorId === message.author.id
		&& timeDelta >= 0
		&& timeDelta <= GROUP_WINDOW_MS;

	if (!isGrouped) {
		if (lastAuthorId !== null) {
			ui.appendChat('');
		}
		if (!systemText) {
			ui.appendChat(`${timestamp} ${author}`);
		}
	}

	const messageStatus = getMessageStatus(message);
	if (message.content) {
		const highlightedContent = highlightMentions(message.content, message, currentUser);
		const rendered = renderDiscordMarkdown(highlightedContent);
		ui.appendChat(`${rendered}${messageStatus}`);
	} else {
		if (systemText) {
			ui.appendChat(`${timestamp} ${systemText}${messageStatus}`);
		} else if (messageStatus) {
			ui.appendChat(messageStatus.trim());
		}
	}

	if (message.embeds?.length > 0) {
		for (const embed of message.embeds) {
			await renderEmbed(embed, ui, showImages);
		}
	}

	if(message.attachments?.size > 0){
		for(const attachment of message.attachments.values()){
			if(showImages && attachment.contentType?.startsWith('image/')){
				try{
					const preview = await displayImage(attachment.url);
					if(preview){
						ui.appendChat(preview);
					}
					else{
						ui.appendChat(chalk.dim('[Image preview unavailable in this terminal]'));
					}
				}
				catch(error){
					ui.appendChat(chalk.red('Failed to load image'));
				}
			}
		}
	}
}