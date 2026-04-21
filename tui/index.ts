import blessed from 'blessed';
import 'dotenv/config';
import chalk from 'chalk';

import { Client, DMChannel, GatewayIntentBits, Events, TextChannel } from 'discord.js';
import { patchBlessedUnicode } from './utils/unicodePatch.js';
import { setupKeyBindings } from './handlers/keyHandler.js';
import { setupMessageHandlers } from './handlers/messageHandler.js';
import { handleChannelSelect } from './handlers/channelHandler.js';
import { setupSidebarHandlers } from './handlers/sidebarHandler.js';
import { runSetup } from './setup.js';
import { createBlessedUIBridge } from './ui/blessedBridge.js';
import { buildSidebarModel } from './utils/channelList.js';

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
let channelMap = new Map<number, TextChannel>();
let unreadChannels = new Set<string>();
let mentionChannels = new Set<string>();
let launcherLocked = false;

function updateSidebarWithUnreads(): void {
	const model = buildSidebarModel(client, unreadChannels, mentionChannels);
	channelMap = model.channelMap;
	ui.setSidebarItems(model.items);
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
	const model = buildSidebarModel(client, unreadChannels, mentionChannels);
	channelMap = model.channelMap;
	ui.setSidebarItems(model.items);

	setupSidebarHandlers(ui, channelMap, model.items.length, async (channel) => {
		currentChannel = channel;
		markChannelAsRead(channel.id);
		await handleChannelSelect(channel, ui, client.user);
	});

	if(model.firstChannelIndex !== undefined){
		ui.selectSidebar(model.firstChannelIndex);
	}

	ui.clearChat();
	ui.focusSidebar();
	ui.render();
});

function startChatClient(): void {
	ui.showChatUI();
	ui.setTitleBar(null, null, 'connecting');
	ui.setChatContent(chalk.hex('#99AAB5')('Connecting to Discord...'));
	ui.render();
	void client.login(process.env.DISCORD_TOKEN).catch(err => {
		ui.setTitleBar(null, null, 'disconnected');
		ui.setChatContent(chalk.hex('#FF0000')(`Failed to connect: ${err.message}`));
		ui.render();
	});
}

ui.onGlobalKey(['enter'], () => {
	if (launcherLocked) return;
	launcherLocked = true;
	startChatClient();
});

ui.onGlobalKey(['s'], async () => {
	if (launcherLocked) return;
	launcherLocked = true;
	screen.destroy();
	await runSetup();
	process.exit(0);
});

ui.focusSidebar();
ui.render();