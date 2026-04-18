import chalk from 'chalk';
import { Message, TextChannel, User } from 'discord.js';
import { renderMessage } from '../utils/messageRenderer.js';
import type { UIBridge } from '../ui/types.js';

const RECENT_MESSAGE_LIMIT = 10;
let activeChannelLoadId = 0;

async function renderChannelMessages(channelName: string, messages: Message[], ui: Pick<UIBridge, 'clearChat' | 'appendChat'>, currentUser: User | null): Promise<void> {
	ui.clearChat();
	ui.appendChat(chalk.green(`✓ Joined #${channelName}`));
	ui.appendChat('');
	ui.appendChat(chalk.yellow('--- Recent messages ---'));

	let lastAuthorId: string | null = null;
	let lastMessageTimestamp: number | null = null;
	for (const message of messages) {
		await renderMessage(message, ui, true, currentUser, lastAuthorId, lastMessageTimestamp);
		lastAuthorId = message.author.id;
		lastMessageTimestamp = message.createdTimestamp;
	}
}

export async function handleChannelSelect(
	channel: TextChannel,
	ui: Pick<UIBridge, 'showChatUI' | 'setChatLabel' | 'setInputLabel' | 'setTitleBar' | 'appendChat' | 'clearChat' | 'setChatContent' | 'setStatusBar' | 'clearInput' | 'hardRefresh' | 'render'>,
	currentUser: User | null = null
): Promise<void>{
	const loadId = ++activeChannelLoadId;

	ui.hardRefresh();
	ui.showChatUI();
	ui.clearChat();
	ui.setChatContent('');
	ui.clearInput();
	ui.setChatLabel(` #${channel.name} `);
	ui.setInputLabel(`Message #${channel.name}`);
	ui.setTitleBar(channel.guild.name, channel.name, 'connecting');
	ui.setStatusBar(chalk.hex('#99AAB5')(`Loading #${channel.name}...`));
	ui.appendChat(chalk.hex('#99AAB5')(`Loading #${channel.name}...`));
	ui.render();

	try{
		const messages = await channel.messages.fetch({ limit: RECENT_MESSAGE_LIMIT });
		const messagesArray = Array.from(messages.values()).reverse();
		if (loadId !== activeChannelLoadId) {
			return;
		}

		ui.setTitleBar(channel.guild.name, channel.name, 'connected');
		ui.setStatusBar(chalk.hex('#57F287')(`Connected to #${channel.name}`));
		await renderChannelMessages(channel.name, messagesArray, ui, currentUser);
	}

	catch{
		if (loadId !== activeChannelLoadId) {
			return;
		}
		ui.setTitleBar(channel.guild.name, channel.name, 'disconnected');
		ui.setStatusBar(chalk.hex('#ED4245')(`Failed to load #${channel.name}`));
		ui.clearChat();
		ui.appendChat(chalk.red('Failed to load messages'));
	}

	ui.render();
}