import blessed from 'blessed';
import 'dotenv/config';
import chalk from 'chalk';

import { Client, DMChannel, GatewayIntentBits, Events, TextChannel } from 'discord.js';
import { setupKeyBindings } from './handlers/keyHandler.js';
import { setupMessageHandlers } from './handlers/messageHandler.js';
import { handleChannelSelect } from './handlers/channelHandler.js';
import { setupSidebarHandlers } from './handlers/sidebarHandler.js';
import { runSetup } from './setup.js';
import { createAppLayout, showChatUI } from './ui/layout.js';
import { populateSidebar } from './utils/channelList.js';

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

const screen = blessed.screen({
	smartCSR : true,
	title: 'Discord TUI',
	fullUnicode: true
});

const { sidebar, chatBox, inputBox, helpBox, launcher } = createAppLayout(screen);

let currentChannel: TextChannel | null = null;
let currentDMChannel: DMChannel | null = null;
const channelMap = new Map<number, TextChannel>();
let launcherLocked = false;

setupKeyBindings(screen, sidebar, chatBox, inputBox);
setupMessageHandlers(
	client, chatBox, inputBox, sidebar, screen, channelMap,
	() => currentChannel,
	(channel) => { currentChannel = channel; },
	() => currentDMChannel,
	(channel) => { currentDMChannel = channel; }
);
setupSidebarHandlers(sidebar, inputBox, screen, channelMap, async (channel) => {
	currentChannel = channel;
	await handleChannelSelect(channel, chatBox, inputBox, screen, client.user);
});

client.once(Events.ClientReady, () => {
	const firstChannelIndex = populateSidebar(client, sidebar, channelMap);
	if(firstChannelIndex !== undefined){
		sidebar.select(firstChannelIndex);
	}

	chatBox.setContent('');
	sidebar.focus();
	screen.render();
});

function startChatClient(): void {
	launcher.hide();
	showChatUI({ sidebar, chatBox, inputBox, helpBox, launcher });
	chatBox.setContent(chalk.hex('#99AAB5')('Connecting to Discord...'));
	screen.render();
	void client.login(process.env.DISCORD_TOKEN).catch(err => {
		chatBox.setContent(chalk.hex('#FF0000')(`Failed to connect: ${err.message}`));
		screen.render();
	});
}

screen.key(['enter'], () => {
	if (launcherLocked) return;
	launcherLocked = true;
	startChatClient();
});

screen.key(['s'], async () => {
	if (launcherLocked) return;
	launcherLocked = true;
	screen.destroy();
	await runSetup();
	process.exit(0);
});

chatBox.focus();
screen.render();