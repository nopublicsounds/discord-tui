import chalk from 'chalk';

import { handleCommand } from './commandHandler.js';
import { Client, DMChannel, Events, Message, TextChannel } from 'discord.js';
import type { Widgets } from 'blessed';
import { renderMessage } from '../utils/messageRenderer.js';
import { formatTime } from '../utils/formatters.js';

export function setupMessageHandlers(
	client: Client,
	chatBox: Widgets.Log,
	inputBox: Widgets.TextboxElement,
	sidebar: Widgets.ListElement,
	screen: Widgets.Screen,
	channelMap: Map<number, TextChannel>,
	getCurrentChannel: () => TextChannel | null,
	setCurrentChannel: (channel: TextChannel) => void,
	getCurrentDMChannel: () => DMChannel | null,
	setCurrentDMChannel: (channel: DMChannel | null) => void
) {
	const resetInput = (): void => {
		inputBox.clearValue();
		setImmediate(() => {
			inputBox.focus();
			screen.render();
		});
	};

	const commandCtx = {
		client,
		chatBox,
		inputBox,
		sidebar,
		screen,
		channelMap,
		getCurrentChannel,
		setCurrentChannel,
		getCurrentDMChannel,
		setCurrentDMChannel,
	};
	
	client.on(Events.MessageCreate, async (message: Message) => {
		if(message.author.id === client.user?.id) return;

		// DM 수신
		const currentDMChannel = getCurrentDMChannel();
		if(currentDMChannel && message.channel.id === currentDMChannel.id){
			const time = formatTime(message.createdTimestamp);
			const author = chalk.cyan(message.author.username);
			if(message.content){
				chatBox.log(`${chalk.gray(`[${time}]`)} ${author}\n${message.content}\n`);
			}
			screen.render();
			return;
		}

		// 일반 채널 수신
		const currentChannel = getCurrentChannel();
		if(currentChannel && message.channel.id === currentChannel.id){
			await renderMessage(message, chatBox, true, client.user);
			chatBox.log('');
			screen.render();
		}
	});

	inputBox.on('submit', async (text: string) => {
		const message = text.trim();

		if(!message){
			resetInput();
			return;
		}

		if (await handleCommand(message, commandCtx)) {
			resetInput();
			return;
		}

		// DM 모드에서 메시지 전송
		const currentDMChannel = getCurrentDMChannel();
		if(currentDMChannel){
			try{
				const sentMessage = await currentDMChannel.send(message);
				const time = formatTime(sentMessage.createdTimestamp);
				chatBox.log(`${chalk.gray(`[${time}]`)} ${chalk.green('You')}\n${message}\n`);
				resetInput();
			}
			catch(error){
				chatBox.log(chalk.red(`Failed to send DM: ${error}`));
				resetInput();
			}
			return;
		}
		
		const currentChannel = getCurrentChannel();
		if(!currentChannel){
			chatBox.log(chalk.red('No channel selected!'));
			resetInput();
			return;
		}

		try{
			const sentMessage = await currentChannel.send(message);
			await renderMessage(sentMessage, chatBox, true);
			resetInput();
		}
		
		catch(error){
			chatBox.log(chalk.red(`Failed to send message: ${error}`));
			resetInput();
		}
	});
}