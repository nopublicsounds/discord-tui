import chalk from 'chalk';
import { Message, User } from 'discord.js';
import { formatTime } from './formatters.js';
import { displayImage } from './imageRenderer.js';
import type { UIBridge } from '../ui/types.js';

function formatAuthorLabel(message: Message, currentUser: User | null): string {
	if(currentUser && message.author.id === currentUser.id){
		return chalk.green('👤 You');
	}

	const authorEmoji = message.author.bot ? '🤖' : '👤';
	return chalk.cyan(`${authorEmoji} ${message.author.username}`);
}

function highlightMentions(content: string, currentUser: User | null): string {
	if (!currentUser) return content;
	
	const userMentionPattern = new RegExp(`<@${currentUser.id}>`, 'g');
	
	return content.replace(userMentionPattern, chalk.bgYellow.black(`@${currentUser.username}`));
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
	lastAuthorId: string | null = null
): Promise<void> {
	const time = formatTime(message.createdTimestamp);
	const author = formatAuthorLabel(message, currentUser);
	const timestamp = chalk.gray(`[${time}]`);
	const isGrouped = lastAuthorId === message.author.id;

	if (!isGrouped) {
		ui.appendChat(`${timestamp} ${author}`);
	}

	if(message.content){
		const highlightedContent = highlightMentions(message.content, currentUser);
		const messageStatus = getMessageStatus(message);
		ui.appendChat(`${highlightedContent}${messageStatus}`);
	}

	if(message.attachments?.size > 0){
		for(const attachment of message.attachments.values()){
			ui.appendChat(`  ${chalk.blue(`${attachment.name}`)}`);
			ui.appendChat(`  ${chalk.dim(`→ ${attachment.url}`)}`);

			if(showImages && attachment.contentType?.startsWith('image/')){
				try{
					const preview = await displayImage(attachment.url);
					if(preview){
						ui.appendChat(preview + '\n');
					}
					else{
						ui.appendChat(chalk.dim('[Image preview unavailable in this terminal]') + '\n');
					}
				}
				catch(error){
					ui.appendChat(chalk.red('Failed to load image') + '\n');
				}
			}
		}
	}

	ui.appendChat('');
}