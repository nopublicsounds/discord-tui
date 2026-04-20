import { ChannelType, Client, TextChannel } from 'discord.js';
import stringWidth from 'string-width';
import { safeChannelName, safeGuildName } from './uiText.js';

export type SidebarModel = {
	items: string[];
	channelMap: Map<number, TextChannel>;
	firstChannelIndex: number | undefined;
};

export function buildSidebarModel(client: Client): SidebarModel {
	const sidebarItems: string[] = [];
	const channelMap = new Map<number, TextChannel>();
	let itemIndex = 0;
	const targetWidth = 20; // 고정 너비 설정

	const padItem = (item: string): string => {
		const width = stringWidth(item);
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
			sidebarItems.push(padItem(`     # ${safeChannelName(channel.name)}`));
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