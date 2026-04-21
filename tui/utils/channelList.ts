import chalk from 'chalk';
import { ChannelType, Client, TextChannel } from 'discord.js';
import stringWidth from 'string-width';
import { safeChannelName, safeGuildName } from './uiText.js';

export type SidebarModel = {
	items: string[];
	channelMap: Map<number, TextChannel>;
	firstChannelIndex: number | undefined;
};

const ANSI_ESCAPE_PATTERN = /\u001B\[[0-?]*[ -/]*[@-~]/g;

function stripAnsiCodes(text: string): string {
	return text.replace(ANSI_ESCAPE_PATTERN, '');
}

export function buildSidebarModel(
	client: Client,
	unreadChannels: Set<string> = new Set(),
	mentionChannels: Set<string> = new Set()
): SidebarModel {
	const sidebarItems: string[] = [];
	const channelMap = new Map<number, TextChannel>();
	let itemIndex = 0;
	const targetWidth = 20; // 고정 너비 설정

	const padItem = (item: string): string => {
		const width = stringWidth(stripAnsiCodes(item));
		const padding = ' '.repeat(Math.max(0, targetWidth - width));
		return item + padding;
	};

	client.guilds.cache.forEach((guild) => {
		sidebarItems.push(padItem(`➤  ${safeGuildName(guild.name)}`));
		itemIndex++;

		const textChannels = guild.channels.cache.filter((channel) => channel.type === ChannelType.GuildText);
		if (textChannels.size > 0) {
			sidebarItems.push(padItem('   ▶ Textchannels'));
			itemIndex++;
		}

		textChannels.forEach((channel) => {
			const hasMention = mentionChannels.has(channel.id);
			const hasUnread = unreadChannels.has(channel.id);
			const unreadMark = hasMention
				? chalk.redBright.bold.inverse('◆')
				: hasUnread
					? chalk.whiteBright.bold('●')
					: ' ';
			const channelLabel = hasMention
				? chalk.redBright.bold.inverse(`# ${safeChannelName(channel.name)}`)
				: hasUnread
					? chalk.whiteBright.bold(`# ${safeChannelName(channel.name)}`)
					: `# ${safeChannelName(channel.name)}`;
			sidebarItems.push(padItem(`   ${unreadMark} ${channelLabel}`));
			channelMap.set(itemIndex, channel as TextChannel);
			itemIndex++;
		});

		sidebarItems.push('');
		itemIndex++;
	});

	return {
		items: sidebarItems,
		channelMap,
		firstChannelIndex: Array.from(channelMap.keys())[0]
	};
}