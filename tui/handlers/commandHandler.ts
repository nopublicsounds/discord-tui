import chalk from 'chalk';
import { Client, TextChannel, DMChannel, User } from 'discord.js';
import type { Widgets } from 'blessed';
import { formatTime } from '../utils/formatters.js';
import { handleChannelSelect } from './channelHandler.js';


export interface CommandContext{
	client: Client;
	chatBox: Widgets.Log;
	inputBox: Widgets.TextboxElement;
	sidebar: Widgets.ListElement;
	screen: Widgets.Screen;
	channelMap: Map<number, TextChannel>;
	getCurrentChannel: () => TextChannel | null;
	setCurrentChannel: (channel: TextChannel) => void;
	currentDMChannel?: DMChannel | null;
  	setCurrentDMChannel?: (channel: DMChannel | null) => void;
}

type CommandHandler = (args: string[], ctx: CommandContext) => Promise<void> | void;
export interface CommandDefinition {
	name: string;
	description: string;
	usage: string;
}

const dmChannelCache = new Map<string, DMChannel>();

const commandDefinitions: CommandDefinition[] = [
	{ name: 'help', usage: '/help', description: 'show list of commands' },
	{ name: 'goto', usage: '/goto <channel>', description: 'change channel' },
	{ name: 'members', usage: '/members', description: 'show list of members' },
	{ name: 'clear', usage: '/clear', description: 'clear chatbox' },
	{ name: 'dmopen', usage: '/dmopen <username>', description: 'open DM conversation with a user' },
	{ name: 'dms', usage: '/dms', description: 'list open DM channels' },
	{ name: 'quit', usage: '/quit', description: 'exit' }
];

function renderHelp(chatBox: Widgets.Log): void {
	chatBox.log(chalk.yellow('--- Commands ---'));

	for(const command of commandDefinitions){
		chatBox.log(chalk.cyan(command.usage) + ` - ${command.description}`);
	}

	chatBox.log('');
}

const commands: Record<string, CommandHandler> = {
	help: (_, { chatBox }) => {
		renderHelp(chatBox);
	},

	goto: async (args, { chatBox, inputBox, screen, channelMap, sidebar, setCurrentChannel }) => {
		if(args.length === 0){
			chatBox.log(chalk.yellow('Example: /goto #general'));
			chatBox.log(chalk.yellow('Example: /goto #general MyServer'));
			screen.render();
			return;
		}

		const channelName = args[0]?.replace(/^#/, '');
		const serverName = args.slice(1).join(' ');

		let candidates: Array<{ channel: TextChannel, index: number }> = [];

		for(const [index, channel] of channelMap){
			if(channelName === channel.name){
				if(serverName && !channel.guild.name.toLowerCase().includes(serverName.toLowerCase())){
					continue;
				}
				
				candidates.push({ channel, index });
			}
		}

		if (candidates.length === 0) {
			chatBox.log(chalk.red(`Channel not found: #${channelName}`));
			screen.render();
			return;
		}
		
		if(candidates.length > 1 && !serverName){
			chatBox.log(chalk.yellow(`Found ${candidates.length} channels named #${channelName}:`));
			candidates.forEach(({ channel }, i) => {
				chatBox.log(chalk.cyan(`  ${i + 1}. #${channel.name}`) + chalk.gray(` in ${channel.guild.name}`));
			});
			chatBox.log(chalk.yellow(`Use: /goto #${channelName} <server>`));
			screen.render();
			return;
		}
		
		const { channel, index } = candidates[0] as { channel: TextChannel, index: number };
	
		setCurrentChannel(channel);
		sidebar.select(index);
		inputBox.setLabel(` # ${channel.name} `);

		try{
			await handleChannelSelect(channel, chatBox, inputBox, screen);
		}
		catch(error){
			chatBox.log(chalk.red('Failed to load messages'));
		}
	},

	members: async (args, { chatBox, getCurrentChannel, screen }) => {
		const currentChannel = getCurrentChannel();
		if(!currentChannel){
			chatBox.log(chalk.red('No channel selected!'));
			return;
		}

		const members = currentChannel.guild.members.cache;
		const online = members.filter(m => m.presence?.status === 'online');
		const idle = members.filter(m => m.presence?.status === 'idle');
		const dnd = members.filter(m => m.presence?.status === 'dnd');
		const offline = members.filter(m => !m.presence || m.presence.status === 'offline');

		chatBox.log(chalk.yellow(`--- Members (${members.size}) ---`));

		if(online.size > 0){
			chatBox.log(chalk.green(`🍀 Online (${online.size})`));
			online.forEach(m => chatBox.log(`  ${m.user.username}`));
		}
		if(idle.size > 0){
			chatBox.log(chalk.yellow(`🌙 Idle (${idle.size})`));
			idle.forEach(m => chatBox.log(`  ${m.user.username}`));
		}
		if(dnd.size > 0){
			chatBox.log(chalk.red(`⛔ DND (${dnd.size})`));
			dnd.forEach(m => chatBox.log(`  ${m.user.username}`));
		}
		if(offline.size > 0){
			chatBox.log(chalk.gray(`⚫ Offline (${offline.size})`));
			offline.forEach(m => chatBox.log(`  ${m.user.username}`));
		}

		chatBox.log('');
		screen.render();
	},

	clear: (args, { chatBox, getCurrentChannel, screen }) => {
		const currentChannel = getCurrentChannel();
		chatBox.setContent('');
		
		if(currentChannel){
			chatBox.setLabel(`▶${currentChannel.guild.name} - #${currentChannel.name}`);
		}
		screen.render();
	},

	quit: () => {
		process.exit(0);
	},


	dmopen: async(args, { client, chatBox, screen, setCurrentDMChannel }) => {
		if(args.length < 1){
			chatBox.log(chalk.yellow('Usage: /dmopen <username>'));
			chatBox.log(chalk.yellow('Example: /dmopen Alice'));
			screen.render();
			return;
		}

		const targetUsername = args[0];
		const targetUser = await findUserByUsername(client, targetUsername as string, chatBox, screen);
		if(!targetUser){
			return;
		}

		try{
			const dmChannel = await targetUser.createDM();
			dmChannelCache.set(targetUsername as string, dmChannel);
			setCurrentDMChannel?.(dmChannel);
			chatBox.log(chalk.green(`✓ DM channel opened with ${chalk.cyan(targetUser.username)}`));
		}
		catch(error){
			 chatBox.log(chalk.red(`Failed to open DM with ${targetUsername}: ${(error as Error).message}`));
		}

		screen.render();
	},

	dms: (args, { chatBox, screen }) => {
		if(dmChannelCache.size === 0){
			chatBox.log(chalk.yellow('No open DM channels'));
			screen.render();
			return;
		}

		chatBox.log(chalk.yellow('--- Open DM Channels ---'));
		dmChannelCache.forEach((channel, username) => {
			chatBox.log(chalk.cyan(username) + ' (ID: ' + channel.id + ')');
		});
		chatBox.log('');
		screen.render();
	}
};

export function getCommandDefinitions(): CommandDefinition[] {
	return [...commandDefinitions];
}

export async function executeCommandByName(commandName: string, args: string[], ctx: CommandContext): Promise<boolean>{
	const normalizedName = commandName.toLowerCase();
	const handler = commands[normalizedName];

	if(!handler){
		ctx.chatBox.log(chalk.red(`Unknown command: /${commandName}  (type /help)`));
		ctx.screen.render();
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
		ctx.chatBox.log(chalk.yellow('Empty command. Type /help'));
		ctx.screen.render();
		return true;
	}

	const [cmd, ...args] = parsed.split(/\s+/);
	await executeCommandByName(cmd as string, args, ctx);
	return true;

}

export async function sendToDMChannel(dmChannel: DMChannel, content: string, chatBox: Widgets.Log, client: Client): Promise<void>{
	try{
		await dmChannel.send(content);
		const time = formatTime(Date.now());
		chatBox.log(chalk.gray(`[${time}]`) + ' ' + chalk.green('You') + ': ' + content);
	}
	catch(error){
		chatBox.log(chalk.red(`Failed to send message: ${(error as Error).message}`));
	}
}

async function findUserByUsername(client: Client, username: string, chatBox: Widgets.Log, screen: Widgets.Screen): Promise<User | null>{
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

	chatBox.log(chalk.red(`User not found: ${username}`));
	screen.render();
  	return null;
}


//TODO: goto 명령어 수행 시  이중 포커스로 인한 키보드 입력 문제