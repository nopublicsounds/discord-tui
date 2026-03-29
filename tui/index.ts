import blessed from 'blessed';
import 'dotenv/config';
import chalk from 'chalk';

import { Client, GatewayIntentBits, Events, ChannelType, TextChannel } from 'discord.js';
import { createSidebar } from './components/sidebar.js';
import { createChatBox } from './components/chatbox.js';
import { createInputBox } from './components/inputbox.js';
import { LOGO } from './components/logo.js';
import { setupKeyBindings } from './handlers/keyHandler.js';
import { setupMessageHandlers } from './handlers/messageHandler.js';
import { handleChannelSelect } from './handlers/channelHandler.js';
import { runSetup } from './setup.js';

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
const helpBox = blessed.box({
	parent: screen,
	name: 'helpBox',
	height: 2,
	bottom: 3,
	left: '30%',
	width: '70%',
	align: 'center',
	valign: 'middle',
	content: chalk.hex('#99AAB5')('↑/↓ Scroll  •  PgUp/PgDn Fast Scroll  •  Ctrl+D Change Focus • /help Show Commands'),
	tags: false,
});

sidebar.hide();
chatBox.hide();
inputBox.hide();
helpBox.hide();

let currentChannel: TextChannel | null = null;
const channelMap = new Map<number, TextChannel>();
let launcherLocked = false;

function hexToRgb(hex: string): [number, number, number] {
	const h = hex.replace('#', '');
	return [parseInt(h.substring(0, 2), 16), parseInt(h.substring(2, 4), 16), parseInt(h.substring(4, 6), 16)];
}

function rgbToHex(r: number, g: number, b: number): string {
	return '#' + [r, g, b].map(v => v.toString(16).padStart(2, '0')).join('');
}

function interpolateHex(a: string, b: string, t: number): string {
	const [ar, ag, ab]: number[] = hexToRgb(a);
	const [br, bg, bb]: number[] = hexToRgb(b);
	const red = Math.round(ar as number + (br as number - ar as number) * t);
	const green = Math.round(ag as number + (bg as number - ag as number) * t);
	const blue = Math.round(ab as number + (bb as number - ab as number) * t);
	return rgbToHex(red, green, blue);
}

const logoLines = LOGO.split('\n');
const startColor = '#5865F2';
const endColor = '#8458f2';

const nonEmptyIndices = logoLines.reduce<number[]>((acc, l, idx) => {
	if (l.trim() !== '') acc.push(idx);
	return acc;
}, []);
const half = Math.ceil(nonEmptyIndices.length / 2);

const coloredLogo = logoLines.map((line, i) => {
	if (line.trim() === '') return line;
	const pos = nonEmptyIndices.indexOf(i);
	if (pos >= half) return chalk.hex(endColor)(line);
	const t = half > 1 ? pos / (half - 1) : 0;
	return chalk.hex(interpolateHex(startColor, endColor, t))(line);
}).join('\n');

const launcher = blessed.box({
	parent: screen,
	top: 'center',
	left: 'center',
	width: 'shrink',
	height: 'shrink',
	align: 'center',
	valign: 'middle',
	content: [
		coloredLogo,
		chalk.hex('#57F287')('[ Enter ] Start chat client'),
		chalk.hex('#FEE75C')('[ s ] Run setup (save token)'),
		chalk.hex('#99AAB5')('[ Ctrl+C ] Exit')
	].join('\n')
});

setupKeyBindings(screen, sidebar, chatBox, inputBox);
setupMessageHandlers(client, chatBox, inputBox, sidebar, screen, channelMap, () => currentChannel, (channel) => { currentChannel = channel; });

client.once(Events.ClientReady, () => {
	const servers: string[] = [];
	let itemIndex = 0;

	client.guilds.cache.forEach(guild => {
		servers.push(` ▶ ${guild.name}`);
		itemIndex++;

		const textChannels = guild.channels.cache.filter(
			ch => ch.type === ChannelType.GuildText
		);

		textChannels.forEach(channel => {
			servers.push(`   # ${channel.name}`);
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

	chatBox.setContent('');
	sidebar.focus();
	screen.render();
});

function startChatClient(): void {
	launcher.hide();
	sidebar.show();
	chatBox.show();
	inputBox.show();
	helpBox.show();
	chatBox.setContent(chalk.hex('#99AAB5')('Connecting to Discord...'));
	screen.render();
	void client.login(process.env.DISCORD_TOKEN);
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

sidebar.key(['down'], () => {
	const totalItems = (sidebar as any).items.length;
	const currIndex = (sidebar as any).selected;
	let nextIndex = (currIndex + 1) % totalItems;
	while(!channelMap.has(nextIndex) && nextIndex !== currIndex){
		nextIndex = (nextIndex + 1) % totalItems;
	}

	sidebar.select(nextIndex);
	screen.render();
});

sidebar.key(['up'], () => {
	const totalItems = (sidebar as any).items.length;
	const currIndex = (sidebar as any).selected;
	let prevIndex = (currIndex - 1 + totalItems) % totalItems;
	while(!channelMap.has(prevIndex) && prevIndex !== currIndex){
		prevIndex = (prevIndex - 1 + totalItems) % totalItems;
	}

	sidebar.select(prevIndex);
	screen.render();
});

sidebar.key(['enter'], async () => {
	const idx = (sidebar as any).selected as number;
	const channel = channelMap.get(idx);
	if (!channel) return;

	currentChannel = channel;
	inputBox.setLabel(` # ${channel.name} `);
	await handleChannelSelect(channel, chatBox, inputBox, screen);
});

chatBox.focus();
screen.render();