#!/usr/bin/env node
import blessed from 'blessed';
import chalk from 'chalk';
import dotenv from 'dotenv';
import path from 'path';
import { fileURLToPath } from 'url';

const __dirname = path.dirname(fileURLToPath(import.meta.url));
dotenv.config({ path: path.resolve(__dirname, '..', '..', '.env') });

import { ChannelType, Client, DMChannel, GatewayIntentBits, Events, TextChannel } from 'discord.js';
import { patchBlessedUnicode } from './utils/unicodePatch.js';
import { setupKeyBindings } from './handlers/keyHandler.js';
import { setupMessageHandlers } from './handlers/messageHandler.js';
import { handleChannelSelect } from './handlers/channelHandler.js';
import { setupSidebarHandlers } from './handlers/sidebarHandler.js';
import { runSetup } from './setup.js';
import { createBlessedUIBridge } from './ui/blessedBridge.js';
import { buildSidebarModel } from './utils/channelList.js';
import type { SelectableChannel } from './utils/channelList.js';
import { showLauncher } from './ui/launcher.js';
import { clear } from 'console';
import { safeChannelName, safeGuildName } from './utils/uiText.js';

const launcherResult = await showLauncher();
const keepAlive = setInterval(() => {}, 1000);

if (launcherResult === 'setup') {
	await runSetup();
	clearInterval(keepAlive);
	process.exit(0);
} else if (launcherResult === 'exit') {
	clearInterval(keepAlive);
	process.exit(0);
}

const client = new Client({
	intents: [
		GatewayIntentBits.Guilds,
		GatewayIntentBits.GuildMessages,
		GatewayIntentBits.MessageContent,
		GatewayIntentBits.GuildMembers,
		GatewayIntentBits.GuildPresences,
		GatewayIntentBits.DirectMessages,
		GatewayIntentBits.DirectMessageTyping,
	]
});

patchBlessedUnicode();

const screen = blessed.screen({
	smartCSR: true,
	title: 'Discord TUI',
	fullUnicode: true,
	terminal: 'xterm-256color',
	sendFocus: true
});

const ui = createBlessedUIBridge(screen);

let currentChannel: TextChannel | null = null;
let currentDMChannel: DMChannel | null = null;
let channelMap = new Map<number, SelectableChannel>();
let unreadChannels = new Set<string>();
let mentionChannels = new Set<string>();

function updateSidebarWithUnreads(): void {
	const selectedIndex = ui.getSidebarSelectedIndex();
	const model = buildSidebarModel(client, unreadChannels, mentionChannels);
	channelMap = model.channelMap;
	ui.setSidebarItems(model.items);

	if (selectedIndex >= 0 && selectedIndex < model.items.length) {
		ui.selectSidebar(selectedIndex);
	}
	else if (model.firstChannelIndex !== undefined) {
		ui.selectSidebar(model.firstChannelIndex);
	}

	ui.render();
}

function markChannelAsUnread(channelId: string, isMention: boolean): void {
	unreadChannels.add(channelId);
	if (isMention) {
		mentionChannels.add(channelId);
	}
	updateSidebarWithUnreads();
}

function markChannelAsRead(channelId: string): void {
	unreadChannels.delete(channelId);
	mentionChannels.delete(channelId);
	updateSidebarWithUnreads();
}

setupKeyBindings(ui);
setupMessageHandlers(
	client, ui, channelMap,
	() => currentChannel,
	(channel) => { currentChannel = channel; },
	() => currentDMChannel,
	(channel) => { currentDMChannel = channel; },
	markChannelAsUnread
);

client.once(Events.ClientReady, () => {
	clearInterval(keepAlive);
	const model = buildSidebarModel(client, unreadChannels, mentionChannels);
	channelMap = model.channelMap;
	ui.setSidebarItems(model.items);

	setupSidebarHandlers(ui, channelMap, model.items.length, async (channel) => {
		if (channel.type === ChannelType.GuildText) {
			currentChannel = channel;
			currentDMChannel = null;
			markChannelAsRead(channel.id);
			await handleChannelSelect(channel, ui, client.user);
			return;
		}

		currentChannel = null;
		currentDMChannel = null;
		const channelDisplayName = safeChannelName(channel.name);
		const guildDisplayName = safeGuildName(channel.guild.name);

		ui.showChatUI();
		ui.clearChat();
		ui.setChatContent('');
		ui.clearInput();
		ui.setChatLabel(` # ${channelDisplayName} `);
		ui.setInputLabel(' Voice join coming soon ');
		ui.setTitleBar(guildDisplayName, channelDisplayName, 'connected');
		ui.setStatusBar(chalk.hex('#FAA61A')(`Voice channel selected: ${channelDisplayName} (join coming soon)`));
		ui.appendChat('');
		ui.appendChat(chalk.hex('#72767D')(`  Server: ${guildDisplayName}`));
		ui.appendChat('');
		ui.appendChat(chalk.hex('#FAA61A')('  Voice join is not implemented yet.'));
		ui.render();
	});

	if(model.firstChannelIndex !== undefined){
		ui.selectSidebar(model.firstChannelIndex);
	}

	ui.clearChat();
	ui.focusSidebar();
	ui.render();
});

ui.showChatUI();
ui.setTitleBar(null, null, 'connecting');
ui.setChatContent(chalk.hex('#99AAB5')('Connecting to Discord...'));
ui.render();

void client.login(process.env.DISCORD_TOKEN).catch(err => {
	ui.setTitleBar(null, null, 'disconnected');
	ui.setChatContent(chalk.hex('#FF0000')(`Failed to connect: ${err.message}`));
	ui.render();
});