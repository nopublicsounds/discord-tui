import chalk from 'chalk';
import { Message, TextChannel, User } from 'discord.js';
import type { Widgets } from 'blessed';
import { renderMessage } from '../utils/messageRenderer.js';

const RECENT_MESSAGE_LIMIT = 10;

async function renderChannelMessages(channelName: string, messages: Message[], chatBox: Widgets.Log, currentUser: User | null): Promise<void> {
	chatBox.setContent('');
	chatBox.log(chalk.green(`✓ Joined #${channelName}`));
	chatBox.log('');
	chatBox.log(chalk.yellow('--- Recent messages ---'));

	let lastAuthorId: string | null = null;
	for (const message of messages) {
		await renderMessage(message, chatBox, true, currentUser, lastAuthorId);
		lastAuthorId = message.author.id;
	}
}

export async function handleChannelSelect(channel: TextChannel, chatBox: Widgets.Log, inputBox: Widgets.TextElement, screen: Widgets.Screen, currentUser: User | null = null): Promise<void>{
	try{
		const messages = await channel.messages.fetch({ limit: RECENT_MESSAGE_LIMIT });
		const messagesArray = Array.from(messages.values()).reverse();

		chatBox.setLabel(`▶${channel.guild.name} - #${channel.name}`);
		await renderChannelMessages(channel.name, messagesArray, chatBox, currentUser);
	}

	catch{
		chatBox.log(chalk.red('Failed to load messages'));
	}

	screen.realloc();
	screen.render();
}