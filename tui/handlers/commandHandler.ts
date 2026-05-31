import chalk from 'chalk';
import { Client, TextChannel, DMChannel, User } from 'discord.js';
import type { UIBridge } from '../ui/types.js';
import { formatTime } from '../utils/formatters.js';
import { renderMessage } from '../utils/messageRenderer.js';
import { safeChannelName, safeGuildName } from '../utils/uiText.js';
import {
	downloadRecentAttachmentForChannel,
	listRecentAttachmentsForChannel,
	openRecentAttachmentForChannel,
} from '../utils/attachmentActions.js';
import { handleChannelSelect } from './channelHandler.js';
import type { SelectableChannel } from '../utils/channelList.js';


export interface CommandContext{
	client: Client;
	ui: UIBridge;
	channelMap: Map<number, SelectableChannel>;
	getCurrentChannel: () => TextChannel | null;
	setCurrentChannel: (channel: TextChannel) => void;
	getCurrentDMChannel: () => DMChannel | null;
	setCurrentDMChannel: (channel: DMChannel | null) => void;
}

type CommandHandler = (args: string[], ctx: CommandContext) => Promise<void> | void;
export interface CommandDefinition {
	name: string;
	description: string;
	usage: string;
}

export interface CommandSuggestion {
	label: string;
	insertValue: string;
}

const dmChannelCache = new Map<string, DMChannel>();

const commandDefinitions: CommandDefinition[] = [
	{ name: 'help', usage: '/help', description: 'show list of commands' },
	{ name: 'goto', usage: '/goto <channel>', description: 'change channel' },
	{ name: 'members', usage: '/members', description: 'show list of members' },
	{ name: 'clear', usage: '/clear', description: 'clear chatbox' },
	{ name: 'dmopen', usage: '/dmopen <username>', description: 'open DM conversation with a user' },
	{ name: 'whois', usage: '/whois <username>', description: 'show user profile summary' },
	{ name: 'dmclose', usage: '/dmclose', description: 'close DM and return to channel' },
	{ name: 'dms', usage: '/dms', description: 'list open DM channels' },
	{ name: 'attachments', usage: '/attachments', description: 'list recent attachments in current session' },
	{ name: 'open', usage: '/open <number>', description: 'open attachment URL in browser' },
	{ name: 'download', usage: '/download <number> [path]', description: 'download attachment to file path' },
	{ name: 'quit', usage: '/quit', description: 'exit' }
];

function renderHelp(ui: UIBridge): void {
	ui.appendChat('');
	ui.appendChat(chalk.hex('#5865F2').bold('  ✦ Commands'));
	ui.appendChat(chalk.hex('#4F545C')('  ' + '─'.repeat(40)));

	for(const command of commandDefinitions){
		ui.appendChat(
			chalk.hex('#7289DA').bold(`  ${command.usage.padEnd(24)}`) +
			chalk.hex('#B9BBBE')(command.description)
		);
	}

	ui.appendChat(chalk.hex('#4F545C')('  ' + '─'.repeat(40)));
	ui.appendChat('');
}

const commands: Record<string, CommandHandler> = {
	help: (_, { ui }) => {
		renderHelp(ui);
	},

	goto: async (args, { client, ui, channelMap, setCurrentChannel }) => {
		if(args.length === 0){
			ui.appendChat(chalk.hex('#FAA61A')('  Usage:') + chalk.hex('#B9BBBE')('  /goto #general'));
			ui.appendChat(chalk.hex('#B9BBBE')('         /goto #general <server>'));
			ui.render();
			return;
		}

		const channelName = args[0]?.replace(/^#/, '');
		const serverName = args.slice(1).join(' ');

		const candidates: Array<{ channel: TextChannel, index: number }> = [];

		for(const [index, channel] of channelMap){
			if (!(channel instanceof TextChannel)) {
				continue;
			}

			if(channelName === channel.name){
				if(serverName && !channel.guild.name.toLowerCase().includes(serverName.toLowerCase())){
					continue;
				}
				
				candidates.push({ channel, index });
			}
		}

		if (candidates.length === 0) {
			ui.appendChat(chalk.hex('#ED4245')('  ⊗ Channel not found: ') + chalk.hex('#B9BBBE')(`#${channelName}`));
			ui.render();
			return;
		}
		
		if(candidates.length > 1 && !serverName){
			ui.appendChat('');
			ui.appendChat(chalk.hex('#5865F2').bold('  ✦ Multiple matches'));
			ui.appendChat(chalk.hex('#4F545C')('  ' + '─'.repeat(40)));
			candidates.forEach(({ channel }, i) => {
				ui.appendChat(
					chalk.hex('#7289DA').bold(`  ${(i + 1) + '. #' + safeChannelName(channel.name)}`) +
					chalk.hex('#B9BBBE')(` in ${safeGuildName(channel.guild.name)}`)
				);
			});
			ui.appendChat(chalk.hex('#4F545C')('  ' + '─'.repeat(40)));
			ui.appendChat(chalk.hex('#B9BBBE')(`  Use: /goto #${channelName} <server>`));
			ui.render();
			return;
		}
		
		const { channel, index } = candidates[0] as { channel: TextChannel, index: number };
	
		setCurrentChannel(channel);
		ui.selectSidebar(index);
		ui.setInputLabel(` # ${safeChannelName(channel.name)} `);

		await handleChannelSelect(channel, ui, client.user);
	},

	members: async (args, { ui, getCurrentChannel }) => {
		const currentChannel = getCurrentChannel();
		if(!currentChannel){
			ui.appendChat(chalk.hex('#ED4245')('  ⊗ No channel selected'));
			return;
		}

		const members = currentChannel.guild.members.cache;
		const online = members.filter(m => m.presence?.status === 'online');
		const idle = members.filter(m => m.presence?.status === 'idle');
		const dnd = members.filter(m => m.presence?.status === 'dnd');
		const offline = members.filter(m => !m.presence || m.presence.status === 'offline');

		ui.appendChat('');
		ui.appendChat(chalk.hex('#5865F2').bold(`  ✦ Members (${members.size})`));
		ui.appendChat(chalk.hex('#4F545C')('  ' + '─'.repeat(40)));

		if(online.size > 0){
			ui.appendChat(chalk.hex('#43B581').bold(`  ● Online (${online.size})`));
			online.forEach(m => ui.appendChat(chalk.hex('#B9BBBE')(`    ${m.user.username}`)));
		}
		if(idle.size > 0){
			ui.appendChat(chalk.hex('#FAA61A').bold(`  ◐ Idle (${idle.size})`));
			idle.forEach(m => ui.appendChat(chalk.hex('#B9BBBE')(`    ${m.user.username}`)));
		}
		if(dnd.size > 0){
			ui.appendChat(chalk.hex('#F04747').bold(`  ⊖ DND (${dnd.size})`));
			dnd.forEach(m => ui.appendChat(chalk.hex('#B9BBBE')(`    ${m.user.username}`)));
		}
		if(offline.size > 0){
			ui.appendChat(chalk.hex('#747F8D').bold(`  ○ Offline (${offline.size})`));
			offline.forEach(m => ui.appendChat(chalk.hex('#4F545C')(`    ${m.user.username}`)));
		}

		ui.appendChat(chalk.hex('#4F545C')('  ' + '─'.repeat(40)));
		ui.appendChat('');
		ui.render();
	},

	clear: (_, { ui, getCurrentChannel, getCurrentDMChannel }) => {
		ui.clearChat();
		const dmChannel = getCurrentDMChannel();
		if(dmChannel){
			ui.setChatLabel(` DM - ${dmChannel.recipient?.username ?? 'Unknown'} `);
		} else {
			const currentChannel = getCurrentChannel();
			if(currentChannel){
				ui.setChatLabel(`▶${safeGuildName(currentChannel.guild.name)} - #${safeChannelName(currentChannel.name)}`);
			}
		}
		ui.render();
	},

	quit: () => {
		process.exit(0);
	},


	dmopen: async(args, { client, ui, setCurrentDMChannel }) => {
		if(args.length < 1){
			ui.appendChat(chalk.hex('#FAA61A')('  Usage:') + chalk.hex('#B9BBBE')('  /dmopen <username>'));
			ui.appendChat(chalk.hex('#B9BBBE')('         /dmopen Alice'));
			ui.render();
			return;
		}

		const targetUsername = args[0] as string;
		const targetUser = await findUserByUsername(client, targetUsername, ui);
		if(!targetUser){
			return;
		}

		try{
			const dmChannel = await targetUser.createDM();
			dmChannelCache.set(targetUsername, dmChannel);

			ui.clearChat();
			ui.setChatLabel(` DM - ${targetUser.username} `);
			ui.setInputLabel(` @ ${targetUser.username} `);
			ui.appendChat('');
			ui.appendChat(chalk.hex('#5865F2').bold(`  ✦ DM — ${targetUser.username}`));
			ui.appendChat(chalk.hex('#4F545C')('  ' + '─'.repeat(40)));

			const messages = await dmChannel.messages.fetch({ limit: 10 });
			const messagesArray = Array.from(messages.values()).reverse();
			let lastAuthorId: string | null = null;
			let lastMessageTimestamp: number | null = null;
			for(const msg of messagesArray){
				await renderMessage(msg, ui, true, client.user, lastAuthorId, lastMessageTimestamp);
				lastAuthorId = msg.author.id;
				lastMessageTimestamp = msg.createdTimestamp;
			}

			setCurrentDMChannel(dmChannel);
		}
		catch(error){
			ui.appendChat(chalk.hex('#ED4245')('  ⊗ Failed to open DM: ') + chalk.hex('#B9BBBE')((error as Error).message));
		}

		ui.render();
	},

	whois: async (args, { client, ui }) => {
		if(args.length < 1){
			ui.appendChat(chalk.hex('#FAA61A')('  Usage:') + chalk.hex('#B9BBBE')('  /whois <username>'));
			ui.render();
			return;
		}

		const targetUsername = args[0] as string;
		const targetUser = await findUserByUsername(client, targetUsername, ui);
		if(!targetUser){
			return;
		}

		const mutualGuilds: string[] = [];
		for (const guild of client.guilds.cache.values()) {
			if (guild.members.cache.has(targetUser.id)) {
				mutualGuilds.push(safeGuildName(guild.name));
			}
		}

		ui.appendChat('');
		ui.appendChat(chalk.hex('#5865F2').bold(`  ✦ User — ${targetUser.username}`));
		ui.appendChat(chalk.hex('#4F545C')('  ' + '─'.repeat(40)));
		ui.appendChat(chalk.hex('#7289DA')('  ID: ') + chalk.hex('#B9BBBE')(targetUser.id));
		if (targetUser.globalName) {
			ui.appendChat(chalk.hex('#7289DA')('  Global Name: ') + chalk.hex('#B9BBBE')(targetUser.globalName));
		}
		ui.appendChat(chalk.hex('#7289DA')('  Created: ') + chalk.hex('#B9BBBE')(targetUser.createdAt.toLocaleString()));
		ui.appendChat(chalk.hex('#7289DA')('  Mutual Servers: ') + chalk.hex('#B9BBBE')(String(mutualGuilds.length)));
		if (mutualGuilds.length > 0) {
			ui.appendChat(chalk.hex('#4F545C')(`  ${mutualGuilds.slice(0, 5).join(', ')}`));
		}
		ui.appendChat(chalk.hex('#4F545C')('  ' + '─'.repeat(40)));
		ui.appendChat('');
		ui.render();
	},

	dmclose: (_, { ui, setCurrentDMChannel, getCurrentChannel }) => {
		setCurrentDMChannel(null);
		const currentChannel = getCurrentChannel();
		if(currentChannel){
			ui.setChatLabel(`▶${safeGuildName(currentChannel.guild.name)} - #${safeChannelName(currentChannel.name)}`);
			ui.setInputLabel(` # ${safeChannelName(currentChannel.name)} `);
		} else {
			ui.setChatLabel(' Chat ');
			ui.setInputLabel(' No channel selected ');
		}
		ui.appendChat(chalk.hex('#4F545C')('  DM closed'));
		ui.render();
	},

	dms: (_, { ui }) => {
		if(dmChannelCache.size === 0){
			ui.appendChat(chalk.hex('#B9BBBE')('  No open DM channels.') + chalk.hex('#4F545C')('  /dmopen <username>'));
			ui.render();
			return;
		}

		ui.appendChat('');
		ui.appendChat(chalk.hex('#5865F2').bold('  ✦ Open DM Channels'));
		ui.appendChat(chalk.hex('#4F545C')('  ' + '─'.repeat(40)));
		dmChannelCache.forEach((_, username) => {
			ui.appendChat(
				chalk.hex('#7289DA').bold(`  /dmopen`) +
				chalk.hex('#B9BBBE')(` ${username}`)
			);
		});
		ui.appendChat(chalk.hex('#4F545C')('  ' + '─'.repeat(40)));
		ui.appendChat('');
		ui.render();
	},

	attachments: (_, { ui, getCurrentChannel, getCurrentDMChannel }) => {
		const currentDMChannel = getCurrentDMChannel();
		const currentChannel = getCurrentChannel();
		const activeChannelId = currentDMChannel?.id ?? currentChannel?.id;
		if (!activeChannelId) {
			ui.appendChat(chalk.hex('#ED4245')('  ⊗ No channel selected'));
			ui.render();
			return;
		}
		const attachments = listRecentAttachmentsForChannel(activeChannelId);
		const lines: string[] = [];

		if (attachments.length === 0) {
			lines.push('No attachments in this channel yet.');
			lines.push('');
			lines.push('Attachments appear after channel messages are rendered.');
		} else {
			for (const [index, attachment] of attachments.entries()) {
				lines.push(`${index + 1}. ${attachment.name}`);
				lines.push(`   ${attachment.contentType ?? 'unknown type'} • ${attachment.url}`);
			}
			lines.push('');
			lines.push('Use /open <number> or /download <number> [path].');
		}

		ui.showAttachmentModal('Attachments', lines);
		ui.render();
	},

	open: async (args, { ui, getCurrentChannel, getCurrentDMChannel }) => {
		const target = Number.parseInt(args[0] ?? '', 10);
		if (!Number.isInteger(target) || target < 1) {
			ui.appendChat(chalk.hex('#FAA61A')('  Usage:') + chalk.hex('#B9BBBE')('  /open <number>'));
			ui.render();
			return;
		}
		const currentDMChannel = getCurrentDMChannel();
		const currentChannel = getCurrentChannel();
		const activeChannelId = currentDMChannel?.id ?? currentChannel?.id;
		if (!activeChannelId) {
			ui.appendChat(chalk.hex('#ED4245')('  ⊗ No channel selected'));
			ui.render();
			return;
		}

		try {
			await openRecentAttachmentForChannel(activeChannelId, target - 1);
			ui.appendChat(chalk.hex('#43B581')(`  Opened attachment #${target} in browser`));
		}
		catch (error) {
			ui.appendChat(chalk.hex('#ED4245')('  ⊗ Failed to open attachment: ') + chalk.hex('#B9BBBE')((error as Error).message));
		}
		ui.render();
	},

	download: async (args, { ui, getCurrentChannel, getCurrentDMChannel }) => {
		const target = Number.parseInt(args[0] ?? '', 10);
		if (!Number.isInteger(target) || target < 1) {
			ui.appendChat(chalk.hex('#FAA61A')('  Usage:') + chalk.hex('#B9BBBE')('  /download <number> [path]'));
			ui.render();
			return;
		}
		const currentDMChannel = getCurrentDMChannel();
		const currentChannel = getCurrentChannel();
		const activeChannelId = currentDMChannel?.id ?? currentChannel?.id;
		if (!activeChannelId) {
			ui.appendChat(chalk.hex('#ED4245')('  ⊗ No channel selected'));
			ui.render();
			return;
		}

		const outputPathArg = args.slice(1).join(' ').trim();
		const outputPath = outputPathArg.length > 0 ? outputPathArg : undefined;

		try {
			const savedPath = await downloadRecentAttachmentForChannel(activeChannelId, target - 1, outputPath);
			ui.appendChat(chalk.hex('#43B581')('  Saved attachment to: ') + chalk.hex('#B9BBBE')(savedPath));
		}
		catch (error) {
			ui.appendChat(chalk.hex('#ED4245')('  ⊗ Failed to download attachment: ') + chalk.hex('#B9BBBE')((error as Error).message));
		}
		ui.render();
	}
};

export function getCommandDefinitions(): CommandDefinition[] {
	return [...commandDefinitions];
}

function getActiveChannelId(ctx: CommandContext): string | null {
	const currentDMChannel = ctx.getCurrentDMChannel();
	const currentChannel = ctx.getCurrentChannel();
	return currentDMChannel?.id ?? currentChannel?.id ?? null;
}

function getCommandContextWeight(commandName: string, inDM: boolean): number {
	if (inDM) {
		return ['dmclose', 'dms', 'attachments', 'open', 'download', 'whois'].includes(commandName) ? 5 : 0;
	}

	return ['goto', 'members', 'attachments', 'open', 'download', 'whois'].includes(commandName) ? 5 : 0;
}

function applyArgumentReplacement(tokens: string[], hasTrailingSpace: boolean, replacement: string): string {
	if (hasTrailingSpace) {
		return `/${tokens.join(' ')} ${replacement} `;
	}

	const head = tokens.slice(0, -1);
	return `/${[...head, replacement].join(' ')} `;
}

function getCommandNameSuggestions(commandQuery: string, ctx: CommandContext): CommandSuggestion[] {
	const normalizedQuery = commandQuery.toLowerCase();
	const inDM = Boolean(ctx.getCurrentDMChannel());

	return commandDefinitions
		.map((definition) => {
			const commandName = definition.name.toLowerCase();
			let baseScore = 0;

			if (!normalizedQuery) {
				baseScore = 10;
			}
			else if (commandName === normalizedQuery) {
				baseScore = 120;
			}
			else if (commandName.startsWith(normalizedQuery)) {
				baseScore = 90;
			}
			else if (commandName.includes(normalizedQuery)) {
				baseScore = 50;
			}

			return {
				definition,
				score: baseScore + getCommandContextWeight(commandName, inDM),
			};
		})
		.filter((item) => item.score > 0)
		.sort((a, b) => b.score - a.score || a.definition.name.localeCompare(b.definition.name))
		.slice(0, 8)
		.map((item) => ({
			label: `/${item.definition.name}  ${item.definition.description}`,
			insertValue: `/${item.definition.name} `,
		}));
}

function getUsernameSuggestions(tokens: string[], hasTrailingSpace: boolean, currentArg: string, ctx: CommandContext): CommandSuggestion[] {
	const query = currentArg.toLowerCase();
	const usernames = new Set<string>();

	for (const guild of ctx.client.guilds.cache.values()) {
		for (const member of guild.members.cache.values()) {
			usernames.add(member.user.username);
		}
	}

	const suggestions = [...usernames]
		.filter((username) => !query || username.toLowerCase().includes(query))
		.sort((a, b) => a.localeCompare(b))
		.slice(0, 8)
		.map((username) => ({
			label: username,
			insertValue: applyArgumentReplacement(tokens, hasTrailingSpace, username),
		}));

	const exactMatch = !hasTrailingSpace && suggestions.some((item) => item.label.toLowerCase() === query);
	return exactMatch ? [] : suggestions;
}

function getGotoSuggestions(tokens: string[], hasTrailingSpace: boolean, currentArg: string, ctx: CommandContext): CommandSuggestion[] {
	const query = currentArg.replace(/^#/, '').toLowerCase();
	const channels = [...ctx.channelMap.values()]
		.filter((channel): channel is TextChannel => channel instanceof TextChannel)
		.filter((channel) => !query || channel.name.toLowerCase().includes(query))
		.slice(0, 8);

	const suggestions = channels.map((channel) => ({
		label: `#${safeChannelName(channel.name)} (${safeGuildName(channel.guild.name)})`,
		insertValue: applyArgumentReplacement(tokens, hasTrailingSpace, `#${channel.name}`),
	}));

	const exactMatch = !hasTrailingSpace && channels.some((channel) => channel.name.toLowerCase() === query);
	return exactMatch ? [] : suggestions;
}

function getAttachmentIndexSuggestions(tokens: string[], hasTrailingSpace: boolean, currentArg: string, ctx: CommandContext): CommandSuggestion[] {
	const query = currentArg.toLowerCase();
	const activeChannelId = getActiveChannelId(ctx);
	if (!activeChannelId) {
		return [];
	}

	const attachments = listRecentAttachmentsForChannel(activeChannelId);
	const suggestions = attachments
		.slice(0, 9)
		.map((attachment, index) => ({
			index: String(index + 1),
			name: attachment.name,
		}))
		.filter((item) => !query || item.index.startsWith(query))
		.map((item) => ({
			label: `${item.index}. ${item.name}`,
			insertValue: applyArgumentReplacement(tokens, hasTrailingSpace, item.index),
		}));

	const exactMatch = !hasTrailingSpace && suggestions.some((item) => item.label.startsWith(`${query}.`));
	return exactMatch ? [] : suggestions;
}

export function getCommandSuggestions(input: string, ctx: CommandContext): CommandSuggestion[] {
	if (!input.startsWith('/')) {
		return [];
	}

	const withoutSlash = input.slice(1);
	if (withoutSlash.trim().length === 0) {
		return getCommandNameSuggestions('', ctx);
	}

	const hasTrailingSpace = /\s$/.test(withoutSlash);
	const tokens = withoutSlash.trim().split(/\s+/);
	const commandName = (tokens[0] ?? '').toLowerCase();

	if (tokens.length === 1 && !hasTrailingSpace) {
		return getCommandNameSuggestions(commandName, ctx);
	}

	const currentArg = hasTrailingSpace ? '' : (tokens[tokens.length - 1] ?? '');

	if (commandName === 'goto') {
		return getGotoSuggestions(tokens, hasTrailingSpace, currentArg, ctx);
	}

	if (commandName === 'dmopen' || commandName === 'whois') {
		return getUsernameSuggestions(tokens, hasTrailingSpace, currentArg, ctx);
	}

	if (commandName === 'open' || commandName === 'download') {
		return getAttachmentIndexSuggestions(tokens, hasTrailingSpace, currentArg, ctx);
	}

	return [];
}

export async function executeCommandByName(commandName: string, args: string[], ctx: CommandContext): Promise<boolean>{
	const normalizedName = commandName.toLowerCase();
	const handler = commands[normalizedName];

	if(!handler){
		ctx.ui.appendChat(chalk.hex('#ED4245')('  ⊗ Unknown command: ') + chalk.hex('#B9BBBE')(`/${commandName}`) + chalk.hex('#4F545C')('  — type /help'));
		ctx.ui.render();
		return false;
	}

	await handler(args, ctx);
	return true;
}

export async function handleCommand(input: string, ctx: CommandContext): Promise<boolean>{
	if(!input.startsWith('/')){
		return false;
	}

	const parsed = input.slice(1).trim();
	if(!parsed){
		ctx.ui.appendChat(chalk.hex('#FAA61A')('  Empty command.') + chalk.hex('#4F545C')('  Type /help'));
		ctx.ui.render();
		return true;
	}

	const [cmd, ...args] = parsed.split(/\s+/);
	await executeCommandByName(cmd as string, args, ctx);
	return true;

}

export async function sendToDMChannel(dmChannel: DMChannel, content: string, ui: UIBridge, client: Client): Promise<void>{
	try{
		await dmChannel.send(content);
		const time = formatTime(Date.now());
		ui.appendChat(chalk.gray(`[${time}]`) + ' ' + chalk.green('You') + ': ' + content);
	}
	catch(error){
		ui.appendChat(chalk.hex('#ED4245')('  ⊗ Failed to send: ') + chalk.hex('#B9BBBE')((error as Error).message));
	}
}

async function findUserByUsername(client: Client, username: string, ui: UIBridge): Promise<User | null>{
	const cached = dmChannelCache.get(username);
	if(cached?.recipient){
		return cached.recipient;
	}

	for(const guild of client.guilds.cache.values()){
		const member = guild.members.cache.find(m => m.user.username === username);
		if(member){
			return member.user;
		}
	}

	for(const guild of client.guilds.cache.values()){
		try{
			const results = await guild.members.search({ query: username, limit: 5});
			const match = results.find(m => m.user.username === username);
			if(match){
				return match.user;
			}
		}
		catch{

		}
	}

	ui.appendChat(chalk.hex('#ED4245')('  ⊗ User not found: ') + chalk.hex('#B9BBBE')(username));
	ui.render();
	return null;
}


