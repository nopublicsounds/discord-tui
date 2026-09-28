#!/usr/bin/env node
import blessed from 'blessed';
import chalk from 'chalk';
import dotenv from 'dotenv';
import path from 'path';
import { fileURLToPath } from 'url';

const __dirname = path.dirname(fileURLToPath(import.meta.url));
dotenv.config({ path: path.resolve(__dirname, '..', '..', '.env'), quiet: true });

import { ChannelType, Client, DMChannel, GatewayIntentBits, Events, TextChannel, VoiceChannel } from 'discord.js';
import { entersState, joinVoiceChannel, VoiceConnectionStatus, type VoiceConnection } from '@discordjs/voice';
import { setupKeyBindings } from './handlers/keyHandler.js';
import { setupMessageHandlers } from './handlers/messageHandler.js';
import { handleChannelSelect, handleVoiceChannelSelect } from './handlers/channelHandler.js';
import { setupSidebarHandlers } from './handlers/sidebarHandler.js';
import { runSetup } from './setup.js';
import { createBlessedUIBridge } from './ui/blessedBridge.js';
import { buildSidebarModel } from './utils/channelList.js';
import type { SelectableChannel } from './utils/channelList.js';
import { showLauncher } from './ui/launcher.js';

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
		GatewayIntentBits.GuildVoiceStates,
		GatewayIntentBits.GuildMembers,
		GatewayIntentBits.GuildPresences,
		GatewayIntentBits.DirectMessages,
		GatewayIntentBits.DirectMessageTyping,
	]
});

const screen = blessed.screen({
	smartCSR: true,
	title: 'Discord TUI',
	fullUnicode: true,
	terminal: 'xterm-256color',
	trueColor: true,
	sendFocus: true
});

const ui = createBlessedUIBridge(screen);

let currentChannel: TextChannel | null = null;
let currentDMChannel: DMChannel | null = null;
let viewedVoiceChannel: VoiceChannel | null = null;
let connectedVoiceChannel: VoiceChannel | null = null;
let activeVoiceConnection: VoiceConnection | null = null;
let channelMap = new Map<number, SelectableChannel>();
let unreadChannels = new Set<string>();
let mentionChannels = new Set<string>();

function disconnectVoiceConnection(): boolean {
	if (!activeVoiceConnection) {
		connectedVoiceChannel = null;
		updateSidebarWithUnreads();
		return false;
	}

	activeVoiceConnection.destroy();
	activeVoiceConnection = null;
	connectedVoiceChannel = null;
	updateSidebarWithUnreads();
	return true;
}

async function disconnectVoiceConnectionGracefully(): Promise<boolean> {
	if (!activeVoiceConnection) {
		connectedVoiceChannel = null;
		updateSidebarWithUnreads();
		return false;
	}

	const connection = activeVoiceConnection;

	try {
		connection.disconnect();
		await entersState(connection, VoiceConnectionStatus.Disconnected, 2_000);
	}
	catch {
		// fallback to destroy below when disconnect state is not observed in time
	}

	connection.destroy();

	try {
		await entersState(connection, VoiceConnectionStatus.Destroyed, 1_000);
	}
	catch {
		// destroyed state can already be final; proceed with shutdown regardless
	}

	activeVoiceConnection = null;
	connectedVoiceChannel = null;
	updateSidebarWithUnreads();
	return true;
}

async function switchVoiceChannel(channel: VoiceChannel): Promise<void> {
	if (activeVoiceConnection && connectedVoiceChannel?.id === channel.id) {
		return;
	}

	disconnectVoiceConnection();

	const nextConnection = joinVoiceChannel({
		channelId: channel.id,
		guildId: channel.guild.id,
		adapterCreator: channel.guild.voiceAdapterCreator,
		selfDeaf: false,
		selfMute: false,
	});

	await entersState(nextConnection, VoiceConnectionStatus.Ready, 10_000);
	activeVoiceConnection = nextConnection;
	connectedVoiceChannel = channel;
	updateSidebarWithUnreads();
}

let isShuttingDown = false;
let shutdownPromise: Promise<void> | null = null;

async function shutdown(exitCode: number = 0): Promise<void> {
	if (isShuttingDown) {
		if (shutdownPromise) {
			await shutdownPromise;
		}
		return;
	}

	isShuttingDown = true;
	shutdownPromise = (async () => {
		await disconnectVoiceConnectionGracefully();

		try {
			client.destroy();
		}
		catch {
			// ignore client teardown failures during shutdown
		}

		try {
			screen.destroy();
		}
		catch {
			// ignore UI teardown failures during shutdown
		}

		clearInterval(keepAlive);
		process.exit(exitCode);
	})();

	await shutdownPromise;
}

function updateSidebarWithUnreads(): void {
	const selectedIndex = ui.getSidebarSelectedIndex();
	const model = buildSidebarModel(client, unreadChannels, mentionChannels, connectedVoiceChannel?.id ?? null);
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

setupKeyBindings(ui, () => {
	void shutdown(0);
});
setupMessageHandlers(
	client, ui, channelMap,
	() => currentChannel,
	(channel) => {
		currentChannel = channel;
		viewedVoiceChannel = null;
	},
	() => currentDMChannel,
	(channel) => {
		currentDMChannel = channel;
		if (channel) {
			viewedVoiceChannel = null;
		}
	},
	markChannelAsUnread,
	{
		leaveVoiceChannel: () => disconnectVoiceConnection(),
		isVoiceConnected: () => activeVoiceConnection !== null,
		requestQuit: async () => {
			await shutdown(0);
		},
	}
);

process.once('SIGINT', () => {
	void shutdown(0);
});

process.once('SIGTERM', () => {
	void shutdown(0);
});

client.once(Events.ClientReady, () => {
	clearInterval(keepAlive);
	const model = buildSidebarModel(client, unreadChannels, mentionChannels, connectedVoiceChannel?.id ?? null);
	channelMap = model.channelMap;
	ui.setSidebarItems(model.items);

	setupSidebarHandlers(ui, channelMap, model.items.length, async (channel) => {
		if (channel.type === ChannelType.GuildText) {
			currentChannel = channel;
			currentDMChannel = null;
			viewedVoiceChannel = null;
			markChannelAsRead(channel.id);
			await handleChannelSelect(channel, ui, client.user);
			return;
		}

		currentChannel = null;
		currentDMChannel = null;
		viewedVoiceChannel = channel;
		handleVoiceChannelSelect(channel, ui, client.user);

		try {
			await switchVoiceChannel(channel);
			ui.setStatusBar(chalk.hex('#57F287')(`Joined voice #${channel.name}`));
			ui.render();
		}
		catch (error) {
			if (viewedVoiceChannel?.id === channel.id) {
				disconnectVoiceConnection();
				ui.setTitleBar(channel.guild.name, channel.name, 'disconnected');
				ui.setStatusBar(chalk.hex('#ED4245')(`Failed to join voice #${channel.name}`));
				ui.appendChat(chalk.hex('#ED4245')(`  ⊗ Failed to join voice: ${(error as Error).message}`));
				ui.render();
			}
		}
	});

	client.on(Events.VoiceStateUpdate, (oldState, newState) => {
		if (!viewedVoiceChannel) {
			return;
		}

		if (oldState.channelId === viewedVoiceChannel.id || newState.channelId === viewedVoiceChannel.id) {
			handleVoiceChannelSelect(viewedVoiceChannel, ui, client.user);
		}
	});

	client.on(Events.PresenceUpdate, (_oldPresence, newPresence) => {
		if (!viewedVoiceChannel) {
			return;
		}

		if (newPresence && viewedVoiceChannel.members.has(newPresence.userId)) {
			handleVoiceChannelSelect(viewedVoiceChannel, ui, client.user);
		}
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