import chalk from 'chalk';
import { Message, User } from 'discord.js';
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
			? chalk.bgYellow.black(`@${user.username}`)
			: chalk.yellow(`@${user.username}`);
		result = result.replace(pattern, display);
	});

	return result;
}

function getMessageStatus(message: Message): string {
	const status: string[] = [];
	if (!message.content && message.attachments.size === 0) {
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
	const timeDelta =
		lastMessageTimestamp === null
			? Number.POSITIVE_INFINITY
			: message.createdTimestamp - lastMessageTimestamp;
	const isGrouped =
		lastAuthorId === message.author.id
		&& timeDelta >= 0
		&& timeDelta <= GROUP_WINDOW_MS;

	if (!isGrouped) {
		if (lastAuthorId !== null) {
			ui.appendChat('');
		}
		ui.appendChat(`${timestamp} ${author}`);
	}

	if(message.content){
		const highlightedContent = highlightMentions(message.content, message, currentUser);
		const rendered = renderDiscordMarkdown(highlightedContent);
		const messageStatus = getMessageStatus(message);
		ui.appendChat(`${rendered}${messageStatus}`);
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