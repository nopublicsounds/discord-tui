import chalk from 'chalk';
import { Message, User } from 'discord.js';
import { formatTime } from './formatters.js';
import { displayImage } from './imageRenderer.js';
import type { Widgets } from 'blessed';

function highlightMentions(content: string, currentUser: User | null): string {
	if (!currentUser) return content;
	
	const userMentionPattern = new RegExp(`<@${currentUser.id}>`, 'g');
	
	return content.replace(userMentionPattern, chalk.bgYellow.black(`@${currentUser.username}`));
}

export async function renderMessage(message: Message, chatBox: Widgets.Log, showImages: boolean = false, currentUser: User | null = null): Promise<void>{
	const time = formatTime(message.createdTimestamp);
	const author = chalk.cyan(message.author.username);
	const timestamp = chalk.gray(`[${time}]`);


	if(message.content){
		const highlightedContent = highlightMentions(message.content, currentUser);
		chatBox.log(`${timestamp} ${author}\n${highlightedContent}\n`);
	}

	if(message.attachments?.size > 0){
		if(!message.content){
			chatBox.log(`${timestamp} ${author}`);
		}

		for(const attachment of message.attachments.values()){
			chatBox.log(`  ${chalk.blue(`${attachment.name}`)}`);
			chatBox.log(`  ${chalk.dim(`→ ${attachment.url}`)}`);

			if(showImages && attachment.contentType?.startsWith('image/')){
				try{
					const preview = await displayImage(attachment.url);
					if(preview){
						chatBox.log(preview + '\n');
					}
					else{
						chatBox.log(chalk.dim('[Image preview unavailable in this terminal]') + '\n');
					}
				}
				catch(error){
					chatBox.log(chalk.red('Failed to load image') + '\n');
				}
			}
		}
	}
}