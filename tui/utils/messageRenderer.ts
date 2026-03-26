import chalk from 'chalk';
import { Message } from 'discord.js';
import { formatTime } from './formatters.js';
import { displayImage } from './imageRenderer.js';
import type { Widgets } from 'blessed';

export async function renderMessage(message: Message, chatBox: Widgets.Log, showImages: boolean = false): Promise<void>{
	const time = formatTime(message.createdTimestamp);
	const author = chalk.cyan(message.author.username);
	const timestamp = chalk.gray(`[${time}]`);


	if(message.content){
		chatBox.log(`${timestamp} ${author}: ${message.content}`);
	}

	if(message.attachments?.size > 0){
		if(!message.content){
			chatBox.log(`${timestamp} ${author}:`);
		}

		for(const attachment of message.attachments.values()){
			chatBox.log(`  ${chalk.blue(`${attachment.name}`)}`);
			chatBox.log(`  ${chalk.dim(`→ ${attachment.url}`)}`);

			if(showImages && attachment.contentType?.startsWith('image/')){
				try{
					const preview = await displayImage(attachment.url);
					if(preview){
						chatBox.log(preview);
					}
				}
				catch(error){
					chatBox.log(chalk.red('  Failed to load image'));
				}
			}
		}
	}
}