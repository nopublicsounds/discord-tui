import chalk from 'chalk';
import { Message, MessageType, User } from 'discord.js';
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

function toEmbedColor(color?: number): string {
	return color ? `#${color.toString(16).padStart(6, '0')}` : '#4F545C';
}

function renderEmbedLine(ui: Pick<UIBridge, 'appendChat'>, prefix: string, text: string): void {
	ui.appendChat(`${prefix} ${text}`);
}

function renderEmbedLines(ui: Pick<UIBridge, 'appendChat'>, prefix: string, content: string): void {
	content.split('\n').forEach((line) => {
		renderEmbedLine(ui, prefix, line);
	});
}

function renderEmbed(embed: any, ui: Pick<UIBridge, 'appendChat'>): void {
	const borderColor = toEmbedColor(embed.color);
	const border = chalk.hex(borderColor)('┃');
	const prefix = `${border} `;

	renderEmbedLine(ui, prefix, chalk.hex('#4F545C').bold('Embed'));

	if (embed.author?.name) {
		const authorText = embed.author.url
			? `${embed.author.name} ${chalk.underline(chalk.hex('#00AFF4')(embed.author.url))}`
			: embed.author.name;
		renderEmbedLine(ui, prefix, chalk.hex('#B9BBBE')(`by ${authorText}`));
	}

	if (embed.title) {
		const titleText = embed.url
			? `${chalk.bold(embed.title)} ${chalk.underline(chalk.hex('#00AFF4')(embed.url))}`
			: chalk.bold(embed.title);
		renderEmbedLine(ui, prefix, titleText);
	}

	if (embed.description) {
		renderEmbedLines(ui, prefix, renderDiscordMarkdown(embed.description));
	}

	if (embed.fields?.length) {
		embed.fields.forEach((field: any) => {
			renderEmbedLine(ui, prefix, chalk.bold(field.name));
			renderEmbedLines(ui, prefix, renderDiscordMarkdown(field.value));
		});
	}

	if (embed.footer?.text) {
		renderEmbedLine(ui, prefix, chalk.dim(embed.footer.text));
	}
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
			renderEmbed(embed, ui);
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