import chalk from 'chalk';
import { Message, TextChannel, User } from 'discord.js';
import { renderMessage } from '../utils/messageRenderer.js';
import type { UIBridge } from '../ui/types.js';

const RECENT_MESSAGE_LIMIT = 10;

async function renderChannelMessages(channelName: string, messages: Message[], ui: Pick<UIBridge, 'clearChat' | 'appendChat'>, currentUser: User | null): Promise<void> {
	ui.clearChat();
	ui.appendChat(chalk.green(`✓ Joined #${channelName}`));
	ui.appendChat('');
	ui.appendChat(chalk.yellow('--- Recent messages ---'));

	let lastAuthorId: string | null = null;
	for (const message of messages) {
		await renderMessage(message, ui, true, currentUser, lastAuthorId);
		lastAuthorId = message.author.id;
	}
}

export async function handleChannelSelect(channel: TextChannel, ui: Pick<UIBridge, 'setChatLabel' | 'appendChat' | 'clearChat' | 'render'>, currentUser: User | null = null): Promise<void>{
	try{
		const messages = await channel.messages.fetch({ limit: RECENT_MESSAGE_LIMIT });
		const messagesArray = Array.from(messages.values()).reverse();

		ui.setChatLabel(`▶${channel.guild.name} - #${channel.name}`);
		await renderChannelMessages(channel.name, messagesArray, ui, currentUser);
	}

	catch{
		ui.appendChat(chalk.red('Failed to load messages'));
	}

	ui.render();
}