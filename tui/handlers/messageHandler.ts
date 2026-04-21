import chalk from 'chalk';

import { handleCommand } from './commandHandler.js';
import { Client, DMChannel, Events, Message, TextChannel } from 'discord.js';
import type { UIBridge } from '../ui/types.js';
import { renderMessage } from '../utils/messageRenderer.js';

export function setupMessageHandlers(
	client: Client,
	ui: UIBridge,
	channelMap: Map<number, TextChannel>,
	getCurrentChannel: () => TextChannel | null,
	setCurrentChannel: (channel: TextChannel) => void,
	getCurrentDMChannel: () => DMChannel | null,
	setCurrentDMChannel: (channel: DMChannel | null) => void,
	markChannelAsUnread: (channelId: string, isMention: boolean) => void
) {
	const resetInput = (): void => {
		ui.clearInput();
		setImmediate(() => {
			ui.focusInput();
			ui.render();
		});
	};

	const lastAuthorMap = new Map<string, string>();
	const lastTimestampMap = new Map<string, number>();

	const resolveLastMessageContext = async (
		target: TextChannel | DMChannel
	): Promise<{ lastAuthorId: string | null; lastMessageTimestamp: number | null }> => {
		const cachedAuthorId = lastAuthorMap.get(target.id) || null;
		const cachedTimestamp = lastTimestampMap.get(target.id) ?? null;

		if (cachedAuthorId !== null && cachedTimestamp !== null) {
			return {
				lastAuthorId: cachedAuthorId,
				lastMessageTimestamp: cachedTimestamp,
			};
		}

		try {
			const latest = await target.messages.fetch({ limit: 1 });
			const previousMessage = latest.first();
			if (previousMessage) {
				lastAuthorMap.set(target.id, previousMessage.author.id);
				lastTimestampMap.set(target.id, previousMessage.createdTimestamp);
				return {
					lastAuthorId: previousMessage.author.id,
					lastMessageTimestamp: previousMessage.createdTimestamp,
				};
			}
		}
		catch {
			// Keep null context when fetch is unavailable; renderer will start a new group.
		}

		return {
			lastAuthorId: cachedAuthorId,
			lastMessageTimestamp: cachedTimestamp,
		};
	};

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
			const lastAuthorId = lastAuthorMap.get(currentDMChannel.id) || null;
			const lastMessageTimestamp = lastTimestampMap.get(currentDMChannel.id) ?? null;
			await renderMessage(message, ui, true, client.user, lastAuthorId, lastMessageTimestamp);
			lastAuthorMap.set(currentDMChannel.id, message.author.id);
			lastTimestampMap.set(currentDMChannel.id, message.createdTimestamp);
			ui.render();
			return;
		}

		const currentChannel = getCurrentChannel();
		if(currentChannel && message.channel.id === currentChannel.id){
			const lastAuthorId = lastAuthorMap.get(currentChannel.id) || null;
			const lastMessageTimestamp = lastTimestampMap.get(currentChannel.id) ?? null;
			await renderMessage(message, ui, true, client.user, lastAuthorId, lastMessageTimestamp);
			lastAuthorMap.set(currentChannel.id, message.author.id);
			lastTimestampMap.set(currentChannel.id, message.createdTimestamp);
			ui.render();
		} else {
			// Mark channel as unread if message is received in a different channel
			if (message.channel.type === 0) { // Text channel
				const isMention = Boolean(
					client.user
					&& (message.mentions.users.has(client.user.id) || message.mentions.everyone)
				);
				markChannelAsUnread(message.channel.id, isMention);
			}
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
				const { lastAuthorId, lastMessageTimestamp } = await resolveLastMessageContext(currentDMChannel);
				const sentMessage = await currentDMChannel.send(message);
				await renderMessage(sentMessage, ui, true, client.user, lastAuthorId, lastMessageTimestamp);
				lastAuthorMap.set(currentDMChannel.id, sentMessage.author.id);
				lastTimestampMap.set(currentDMChannel.id, sentMessage.createdTimestamp);
				resetInput();
			}
			catch(error){
				ui.appendChat(chalk.hex('#ED4245')('  ⊗ Failed to send DM: ') + chalk.hex('#B9BBBE')(`${error}`));
				resetInput();
			}
			return;
		}
		
		const currentChannel = getCurrentChannel();
		if(!currentChannel){
			ui.appendChat(chalk.hex('#ED4245')('  ⊗ No channel selected'));
			resetInput();
			return;
		}

		try{
			const { lastAuthorId, lastMessageTimestamp } = await resolveLastMessageContext(currentChannel);
			const sentMessage = await currentChannel.send(message);
			await renderMessage(sentMessage, ui, true, client.user, lastAuthorId, lastMessageTimestamp);
			lastAuthorMap.set(currentChannel.id, sentMessage.author.id);
			lastTimestampMap.set(currentChannel.id, sentMessage.createdTimestamp);
			resetInput();
		}
		
		catch(error){
			ui.appendChat(chalk.hex('#ED4245')('  ⊗ Failed to send: ') + chalk.hex('#B9BBBE')(`${error}`));
			resetInput();
		}
	});
}