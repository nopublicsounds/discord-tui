import chalk from 'chalk';
import { Client, TextChannel, DMChannel, User } from 'discord.js';
import type { UIBridge } from '../ui/types.js';
import { formatTime } from '../utils/formatters.js';
import { handleChannelSelect } from './channelHandler.js';


export interface CommandContext{
	client: Client;
	ui: UIBridge;
	channelMap: Map<number, TextChannel>;
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

const dmChannelCache = new Map<string, DMChannel>();

const commandDefinitions: CommandDefinition[] = [
	{ name: 'help', usage: '/help', description: 'show list of commands' },
	{ name: 'goto', usage: '/goto <channel>', description: 'change channel' },
	{ name: 'members', usage: '/members', description: 'show list of members' },
	{ name: 'clear', usage: '/clear', description: 'clear chatbox' },
	{ name: 'dmopen', usage: '/dmopen <username>', description: 'open DM conversation with a user' },
	{ name: 'dmclose', usage: '/dmclose', description: 'close DM and return to channel' },
	{ name: 'dms', usage: '/dms', description: 'list open DM channels' },
	{ name: 'quit', usage: '/quit', description: 'exit' }
];

function renderHelp(ui: UIBridge): void {
	ui.appendChat(chalk.yellow('--- Commands ---'));

	for(const command of commandDefinitions){
		ui.appendChat(chalk.cyan(command.usage) + ` - ${command.description}`);
	}

	ui.appendChat('');
}

const commands: Record<string, CommandHandler> = {
	help: (_, { ui }) => {
		renderHelp(ui);
	},

	goto: async (args, { client, ui, channelMap, setCurrentChannel }) => {
		if(args.length === 0){
			ui.appendChat(chalk.yellow('Example: /goto #general'));
			ui.appendChat(chalk.yellow('Example: /goto #general MyServer'));
			ui.render();
			return;
		}

		const channelName = args[0]?.replace(/^#/, '');
		const serverName = args.slice(1).join(' ');

		const candidates: Array<{ channel: TextChannel, index: number }> = [];

		for(const [index, channel] of channelMap){
			if(channelName === channel.name){
				if(serverName && !channel.guild.name.toLowerCase().includes(serverName.toLowerCase())){
					continue;
				}
				
				candidates.push({ channel, index });
			}
		}

		if (candidates.length === 0) {
			ui.appendChat(chalk.red(`Channel not found: #${channelName}`));
			ui.render();
			return;
		}
		
		if(candidates.length > 1 && !serverName){
			ui.appendChat(chalk.yellow(`Found ${candidates.length} channels named #${channelName}:`));
			candidates.forEach(({ channel }, i) => {
				ui.appendChat(chalk.cyan(`  ${i + 1}. #${channel.name}`) + chalk.gray(` in ${channel.guild.name}`));
			});
			ui.appendChat(chalk.yellow(`Use: /goto #${channelName} <server>`));
			ui.render();
			return;
		}
		
		const { channel, index } = candidates[0] as { channel: TextChannel, index: number };
	
		setCurrentChannel(channel);
		ui.selectSidebar(index);
		ui.setInputLabel(` # ${channel.name} `);

		await handleChannelSelect(channel, ui, client.user);
	},

	members: async (args, { ui, getCurrentChannel }) => {
		const currentChannel = getCurrentChannel();
		if(!currentChannel){
			ui.appendChat(chalk.red('No channel selected!'));
			return;
		}

		const members = currentChannel.guild.members.cache;
		const online = members.filter(m => m.presence?.status === 'online');
		const idle = members.filter(m => m.presence?.status === 'idle');
		const dnd = members.filter(m => m.presence?.status === 'dnd');
		const offline = members.filter(m => !m.presence || m.presence.status === 'offline');

		ui.appendChat(chalk.yellow(`--- Members (${members.size}) ---`));

		if(online.size > 0){
			ui.appendChat(chalk.green(`🍀 Online (${online.size})`));
			online.forEach(m => ui.appendChat(`  ${m.user.username}`));
		}
		if(idle.size > 0){
			ui.appendChat(chalk.yellow(`🌙 Idle (${idle.size})`));
			idle.forEach(m => ui.appendChat(`  ${m.user.username}`));
		}
		if(dnd.size > 0){
			ui.appendChat(chalk.red(`⛔ DND (${dnd.size})`));
			dnd.forEach(m => ui.appendChat(`  ${m.user.username}`));
		}
		if(offline.size > 0){
			ui.appendChat(chalk.gray(`⚫ Offline (${offline.size})`));
			offline.forEach(m => ui.appendChat(`  ${m.user.username}`));
		}

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
				ui.setChatLabel(`▶${currentChannel.guild.name} - #${currentChannel.name}`);
			}
		}
		ui.render();
	},

	quit: () => {
		process.exit(0);
	},


	dmopen: async(args, { client, ui, setCurrentDMChannel }) => {
		if(args.length < 1){
			ui.appendChat(chalk.yellow('Usage: /dmopen <username>'));
			ui.appendChat(chalk.yellow('Example: /dmopen Alice'));
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
			ui.appendChat(chalk.green(`✓ DM with ${chalk.cyan(targetUser.username)}`));
			ui.appendChat(chalk.yellow('--- Recent messages ---'));

			const messages = await dmChannel.messages.fetch({ limit: 10 });
			const messagesArray = Array.from(messages.values()).reverse();
			for(const msg of messagesArray){
				const time = formatTime(msg.createdTimestamp);
				const author = msg.author.id === client.user?.id
					? chalk.green('You')
					: chalk.cyan(msg.author.username);
				if(msg.content){
					ui.appendChat(`${chalk.gray(`[${time}]`)} ${author}\n${msg.content}\n`);
				}
			}

			setCurrentDMChannel(dmChannel);
		}
		catch(error){
			ui.appendChat(chalk.red(`Failed to open DM with ${targetUsername}: ${(error as Error).message}`));
		}

		ui.render();
	},

	dmclose: (_, { ui, setCurrentDMChannel, getCurrentChannel }) => {
		setCurrentDMChannel(null);
		const currentChannel = getCurrentChannel();
		if(currentChannel){
			ui.setChatLabel(`▶${currentChannel.guild.name} - #${currentChannel.name}`);
			ui.setInputLabel(` # ${currentChannel.name} `);
		} else {
			ui.setChatLabel(' Chat ');
			ui.setInputLabel(' No channel selected ');
		}
		ui.appendChat(chalk.gray('--- DM closed ---'));
		ui.render();
	},

	dms: (_, { ui }) => {
		if(dmChannelCache.size === 0){
			ui.appendChat(chalk.yellow('No open DM channels. Use /dmopen <username> to start one.'));
			ui.render();
			return;
		}

		ui.appendChat(chalk.yellow('--- Open DM Channels ---'));
		dmChannelCache.forEach((_, username) => {
			ui.appendChat(chalk.cyan(`  /dmopen ${username}`));
		});
		ui.appendChat('');
		ui.render();
	}
};

export function getCommandDefinitions(): CommandDefinition[] {
	return [...commandDefinitions];
}

export async function executeCommandByName(commandName: string, args: string[], ctx: CommandContext): Promise<boolean>{
	const normalizedName = commandName.toLowerCase();
	const handler = commands[normalizedName];

	if(!handler){
		ctx.ui.appendChat(chalk.red(`Unknown command: /${commandName}  (type /help)`));
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
		ctx.ui.appendChat(chalk.yellow('Empty command. Type /help'));
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
		ui.appendChat(chalk.red(`Failed to send message: ${(error as Error).message}`));
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

	ui.appendChat(chalk.red(`User not found: ${username}`));
	ui.render();
	return null;
}


