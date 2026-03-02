import chalk from 'chalk';
import { Client, TextChannel, DMChannel, User } from 'discord.js';
import type { Widgets } from 'blessed';
import { formatTime } from '../utils/formatters.js';

interface CommandContext{
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
const dmChannelCache = new Map<string, DMChannel>();

const commands: Record<string, CommandHandler> = {
	help: (args, { chatBox }) => {
		chatBox.log(chalk.yellow('--- Commands ---'));
		chatBox.log(chalk.cyan('/help') + ' - show list of commands');
		chatBox.log(chalk.cyan('/goto <channel>') + ' - change channel');
		chatBox.log(chalk.cyan('/members') + ' - show list of members');
		chatBox.log(chalk.cyan('/clear') + ' - clear chatbox');
		chatBox.log(chalk.cyan('/sh') + ' - open shell');
		chatBox.log(chalk.cyan('/dm <username> <message>') + ' - send a DM to a user');
    	chatBox.log(chalk.cyan('/dmopen <username>') + ' - open DM conversation with a user');
    	chatBox.log(chalk.cyan('/dms') + ' - list open DM channels');
		chatBox.log(chalk.cyan('/quit') + ' - exit');
		chatBox.log('');
	},

	goto: async (args, { client, chatBox, inputBox, screen, channelMap, sidebar, setCurrentChannel }) => {
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
		
		const { channel, index } = candidates[0];
	
		setCurrentChannel(channel);
		sidebar.select(index);

		try{
			const messages = await channel.messages.fetch({ limit: 10 });
			chatBox.setContent('');
			chatBox.setLabel(`▶${channel.guild.name} - #${channel.name}`);
			chatBox.log(chalk.green(`✓ Moved to #${channel.name}`));
			chatBox.log('');

			messages.reverse().forEach(msg => {
				const time = formatTime(msg.createdTimestamp);
				chatBox.log(chalk.gray(`[${time}]`) + ' ' + chalk.cyan(msg.author.username) + ': ' + msg.content);
			});
		}
		catch(error){
			chatBox.log(chalk.red('Failed to load messages'));
		}

		screen.render();
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
			chatBox.log(chalk.green(`🟢 Online (${online.size})`));
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

	
	sh: (_, { screen }) => {
		screen.leave();
		console.log(chalk.yellow('Enter exit to return to Discord'));
		screen.spawn(process.env.SHELL || 'bash', [], {
			stdio: 'inherit'
		});
		
		screen.enter();
		screen.render();
	},

	dm: async(args, { client, chatBox, screen}) => {
		if(args.length < 2){
			chatBox.log(chalk.yellow('Usage: /dm <username> <message>'));
			chatBox.log(chalk.yellow('Example: /dm Alice hello there!'));
			screen.render();
			return;
		}

		const targetUsername = args[0];
		const messageContent = args.slice(1).join(' ');

		
	}
};

export async function handleCommand(input: string, ctx: CommandContext): Promise<boolean>{
	if(!input.startsWith('/')){
		return false;
	}

	const [cmd, ...args] = input.slice(1).trim().split(/\s+/);
	const handler = commands[(cmd as string).toLowerCase()];

	if(!handler){
		ctx.chatBox.log(chalk.red(`Unknown command: /${cmd}  (type /help)`));
		ctx.screen.render();
		return true;
	}

	await handler(args, ctx);
	return true;
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

