import blessed from 'blessed';
import 'dotenv/config';
import chalk from 'chalk';

import { Client, GatewayIntentBits, Events, ChannelType, TextChannel } from 'discord.js';
import { createSidebar } from './components/sidebar.js';
import { createChatBox } from './components/chatbox.js';
import { createInputBox } from './components/inputbox.js';
import { LOGO, GUIDE } from './components/logo.js';
import { setupKeyBindings } from './handlers/keyBindings.js';
import { setupMessageHandlers } from './handlers/messageHandler.js';
import { handleChannelSelect } from './handlers/channelHandler.js';

const client = new Client({
	intents: [
		GatewayIntentBits.Guilds,
		GatewayIntentBits.GuildMessages,
		GatewayIntentBits.MessageContent,
		GatewayIntentBits.GuildMembers,
		GatewayIntentBits.GuildPresences
	]
});

const screen = blessed.screen({
	smartCSR : true,
	title: 'Discord TUI',
	fullUnicode: true,
});

const sidebar = createSidebar(screen);
const chatBox = createChatBox(screen);
const inputBox = createInputBox(screen);

let currentChannel: TextChannel | null = null;
const channelMap = new Map<number, TextChannel>();

setupKeyBindings(screen, sidebar, chatBox, inputBox);
setupMessageHandlers(client, chatBox, inputBox, sidebar, screen, channelMap, () => currentChannel, (channel) => { currentChannel = channel; });

client.once(Events.ClientReady, (readyClient) => {
	chatBox.log(chalk.green(`✓ Logged in as ${readyClient.user?.tag}`));
	chatBox.log(chalk.blue(LOGO));
	chatBox.log(chalk.dim('  Press any key to continue...'));
	screen.render();

	screen.once('keypress', () => {
		chatBox.setContent('');
		chatBox.log(GUIDE);
		screen.render();


		const servers: string[] = [];
		let itemIndex = 0;

		client.guilds.cache.forEach(guild => {
			servers.push(`▶${guild.name}`);
			itemIndex++;

			const textChannels = guild.channels.cache.filter(
				ch => ch.type === ChannelType.GuildText
			);

			textChannels.forEach(channel => {
				servers.push(`  #${channel.name}`);
				channelMap.set(itemIndex, channel as TextChannel);
				itemIndex++;
			});

			servers.push('');
			itemIndex++;
		});

		sidebar.setItems(servers);

		const firstChannelIndex = Array.from(channelMap.keys())[0];
		if(firstChannelIndex !== undefined){
			sidebar.select(firstChannelIndex);
		}

		sidebar.focus();
		screen.render();
	});
});

sidebar.key(['down'], () => {
	const totalItems = sidebar.items.length;
	const currIndex = sidebar.selected;
	let nextIndex = (currIndex + 1) % totalItems;
	while(!channelMap.has(nextIndex) && nextIndex !== currIndex){
		nextIndex = (nextIndex + 1) % totalItems;
	}

	sidebar.select(nextIndex);
	screen.render();
});

sidebar.key(['up'], () => {
	const totalItems = sidebar.items.length;
	const currIndex = sidebar.selected;
	let prevIndex = (currIndex - 1 + totalItems) % totalItems;
	while(!channelMap.has(prevIndex) && prevIndex !== currIndex){
		prevIndex = (prevIndex - 1 + totalItems) % totalItems;
	}

	sidebar.select(prevIndex);
	screen.render();
});

sidebar.key(['enter'], async () => {
	const idx = sidebar.selected;
	const channel = channelMap.get(idx);
	if(!channel) return; 

	currentChannel = channel;
	await handleChannelSelect(channel, chatBox, inputBox, screen);
});

chatBox.focus();
screen.render();

client.login(process.env.DISCORD_TOKEN);