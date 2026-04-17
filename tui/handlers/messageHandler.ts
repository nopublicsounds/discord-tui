import chalk from 'chalk';

import { handleCommand } from './commandHandler.js';
import { Client, DMChannel, Events, Message, TextChannel } from 'discord.js';
import type { UIBridge } from '../ui/types.js';
import { renderMessage } from '../utils/messageRenderer.js';
import { formatTime } from '../utils/formatters.js';

export function setupMessageHandlers(
	client: Client,
	ui: UIBridge,
	channelMap: Map<number, TextChannel>,
	getCurrentChannel: () => TextChannel | null,
	setCurrentChannel: (channel: TextChannel) => void,
	getCurrentDMChannel: () => DMChannel | null,
	setCurrentDMChannel: (channel: DMChannel | null) => void
) {
	const resetInput = (): void => {
		ui.clearInput();
		setImmediate(() => {
			ui.focusInput();
			ui.render();
		});
	};

	const lastAuthorMap = new Map<string, string>();

	const commandCtx = {
		client,
		ui,
		channelMap,
		getCurrentChannel,
		setCurrentChannel,
		getCurrentDMChannel,
		setCurrentDMChannel,
	};
	
	client.on(Events.MessageCreate, async (message: Message) => {
		if(message.author.id === client.user?.id) return;

		const currentDMChannel = getCurrentDMChannel();
		if(currentDMChannel && message.channel.id === currentDMChannel.id){
			const time = formatTime(message.createdTimestamp);
			const authorEmoji = message.author.bot ? '🤖' : '👤';
			const author = chalk.cyan(`${authorEmoji} ${message.author.username}`);
			if(message.content){
				ui.appendChat(`${chalk.gray(`[${time}]`)} ${author}\n${message.content}\n`);
			}
			lastAuthorMap.set(currentDMChannel.id, message.author.id);
			ui.render();
			return;
		}

		const currentChannel = getCurrentChannel();
		if(currentChannel && message.channel.id === currentChannel.id){
			const lastAuthorId = lastAuthorMap.get(currentChannel.id) || null;
			await renderMessage(message, ui, true, client.user, lastAuthorId);
			lastAuthorMap.set(currentChannel.id, message.author.id);
			ui.render();
		}
	});

	ui.onInputSubmit(async (text: string) => {
		const message = text.trim();

		if(!message){
			resetInput();
			return;
		}

		if (await handleCommand(message, commandCtx)) {
			resetInput();
			return;
		}

		const currentDMChannel = getCurrentDMChannel();
		if(currentDMChannel){
			try{
				const sentMessage = await currentDMChannel.send(message);
				const time = formatTime(sentMessage.createdTimestamp);
				ui.appendChat(`${chalk.gray(`[${time}]`)} ${chalk.green('👤 You')}\n${message}\n`);
				lastAuthorMap.set(currentDMChannel.id, sentMessage.author.id);
				resetInput();
			}
			catch(error){
				ui.appendChat(chalk.red(`Failed to send DM: ${error}`));
				resetInput();
			}
			return;
		}
		
		const currentChannel = getCurrentChannel();
		if(!currentChannel){
			ui.appendChat(chalk.red('No channel selected!'));
			resetInput();
			return;
		}

		try{
			const sentMessage = await currentChannel.send(message);
			const lastAuthorId = lastAuthorMap.get(currentChannel.id) || null;
			await renderMessage(sentMessage, ui, true, client.user, lastAuthorId);
			lastAuthorMap.set(currentChannel.id, sentMessage.author.id);
			resetInput();
		}
		
		catch(error){
			ui.appendChat(chalk.red(`Failed to send message: ${error}`));
			resetInput();
		}
	});
}