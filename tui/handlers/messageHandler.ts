import chalk from 'chalk';

import { handleCommand } from './commandHandler.js';
import { handleChannelSelect } from './channelHandler.js';
import { Client, DMChannel, Events, Message, TextChannel } from 'discord.js';
import type { PartialMessage } from 'discord.js';
import type { UIBridge } from '../ui/types.js';
import { renderMessage } from '../utils/messageRenderer.js';
import { resolveMentionsForSend } from '../utils/mentionResolver.js';

const MENTION_INPUT_REGEX = /(?:^|\s)@([^\s@]*)$/;
const MAX_MENTION_SUGGESTIONS = 6;

type MentionCandidate = {
	label: string;
	insertValue: string;
};

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
	let mentionCandidates: MentionCandidate[] = [];
	let selectedMentionIndex = 0;

	const resetMentionState = (): void => {
		mentionCandidates = [];
		selectedMentionIndex = 0;
		ui.hideMentionSuggestions();
	};

	const renderMentionCandidates = (): void => {
		if (mentionCandidates.length === 0) {
			ui.hideMentionSuggestions();
			return;
		}

		ui.showMentionSuggestions(
			mentionCandidates.map((candidate) => candidate.label),
			selectedMentionIndex
		);
	};

	const applySelectedMentionFromText = (text: string): string | null => {
		const selected = mentionCandidates[selectedMentionIndex];
		if (!selected) {
			return null;
		}

		const mentionMatch = text.match(MENTION_INPUT_REGEX);
		if (!mentionMatch || mentionMatch.index === undefined) {
			return null;
		}

		const tokenStart = mentionMatch.index + mentionMatch[0].lastIndexOf('@') + 1;
		const tokenEnd = mentionMatch.index + mentionMatch[0].length;
		return `${text.slice(0, tokenStart)}${selected.insertValue} ${text.slice(tokenEnd)}`;
	};

	const resetInput = (): void => {
		ui.clearInput();
		resetMentionState();
		setImmediate(() => {
			ui.focusInput();
			ui.render();
		});
	};

	const updateMentionSuggestions = (): void => {
		const inputValue = ui.getInputValue();
		const mentionMatch = inputValue.match(MENTION_INPUT_REGEX);
		if (!mentionMatch) {
			resetMentionState();
			ui.render();
			return;
		}

		const currentChannel = getCurrentChannel();
		if (!currentChannel) {
			resetMentionState();
			ui.render();
			return;
		}

		const query = mentionMatch[1]?.trim().toLowerCase() ?? '';
		const suggestions = currentChannel.guild.members.cache
			.map((member) => ({
				display: member.displayName,
				username: member.user.username,
			}))
			.filter((member) => {
				if (!query) {
					return true;
				}
				return member.display.toLowerCase().includes(query)
					|| member.username.toLowerCase().includes(query);
			})
			.slice(0, MAX_MENTION_SUGGESTIONS)
			.map((member): MentionCandidate => {
				if (member.display === member.username) {
					return {
						label: `@${member.display}`,
						insertValue: member.username,
					};
				}
				return {
					label: `@${member.display} (${member.username})`,
					insertValue: member.username,
				};
			});

		if (suggestions.length === 0) {
			resetMentionState();
		}
		else {
			mentionCandidates = suggestions;
			selectedMentionIndex = Math.min(selectedMentionIndex, mentionCandidates.length - 1);
			renderMentionCandidates();
		}

		ui.render();
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

	const reloadCurrentDMChannel = async (dmChannel: DMChannel): Promise<void> => {
		ui.clearChat();
		ui.appendChat('');
		ui.appendChat(chalk.hex('#5865F2').bold(`  ✦ DM — ${dmChannel.recipient?.username ?? 'Unknown'}`));
		ui.appendChat(chalk.hex('#4F545C')('  ' + '─'.repeat(40)));
		const messages = await dmChannel.messages.fetch({ limit: 50 });
		const messagesArray = Array.from(messages.values()).reverse();
		let lastAuthorId: string | null = null;
		let lastMessageTimestamp: number | null = null;
		for (const msg of messagesArray) {
			await renderMessage(msg, ui, true, client.user ?? null, lastAuthorId, lastMessageTimestamp);
			lastAuthorId = msg.author.id;
			lastMessageTimestamp = msg.createdTimestamp;
		}
		if (lastAuthorId) lastAuthorMap.set(dmChannel.id, lastAuthorId);
		if (lastMessageTimestamp) lastTimestampMap.set(dmChannel.id, lastMessageTimestamp);
		ui.render();
	};

	const handleMessageMutation = async (message: Message | PartialMessage): Promise<void> => {
		const currentChannel = getCurrentChannel();
		if (currentChannel && message.channel.id === currentChannel.id) {
			lastAuthorMap.delete(currentChannel.id);
			lastTimestampMap.delete(currentChannel.id);
			await handleChannelSelect(currentChannel, ui, client.user ?? null);
			ui.render();
			return;
		}
		const currentDMChannel = getCurrentDMChannel();
		if (currentDMChannel && message.channel.id === currentDMChannel.id) {
			lastAuthorMap.delete(currentDMChannel.id);
			lastTimestampMap.delete(currentDMChannel.id);
			await reloadCurrentDMChannel(currentDMChannel);
		}
	};

	client.on(Events.MessageUpdate, async (_oldMessage, newMessage) => {
		await handleMessageMutation(newMessage);
	});

	client.on(Events.MessageDelete, async (message) => {
		await handleMessageMutation(message);
	});

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
		if (mentionCandidates.length > 0) {
			const nextValue = applySelectedMentionFromText(text);
			resetMentionState();
			ui.setInputValue(nextValue ?? text);
			ui.focusInput();
			ui.render();
			return;
		}

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
			const mentionResolvedMessage = await resolveMentionsForSend(currentChannel, message);
			const sentMessage = await currentChannel.send(mentionResolvedMessage);
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

	ui.onInputKeypress(() => {
		setImmediate(updateMentionSuggestions);
	});

	ui.onInputKey(['up'], () => {
		if (mentionCandidates.length === 0) {
			return;
		}

		selectedMentionIndex = (selectedMentionIndex - 1 + mentionCandidates.length) % mentionCandidates.length;
		renderMentionCandidates();
		ui.render();
	});

	ui.onInputKey(['down'], () => {
		if (mentionCandidates.length === 0) {
			return;
		}

		selectedMentionIndex = (selectedMentionIndex + 1) % mentionCandidates.length;
		renderMentionCandidates();
		ui.render();
	});

}