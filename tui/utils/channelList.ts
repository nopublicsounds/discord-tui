import { ChannelType, Client, TextChannel } from 'discord.js';

export type SidebarModel = {
	items: string[];
	channelMap: Map<number, TextChannel>;
	firstChannelIndex: number | undefined;
};

export function buildSidebarModel(client: Client): SidebarModel {
	const sidebarItems: string[] = [];
	const channelMap = new Map<number, TextChannel>();
	let itemIndex = 0;

	client.guilds.cache.forEach((guild) => {
		sidebarItems.push(`➤  ${guild.name}`);
		itemIndex++;

		const textChannels = guild.channels.cache.filter((channel) => channel.type === ChannelType.GuildText);
		if (textChannels.size > 0) {
			sidebarItems.push('   ▶ Textchannels');
			itemIndex++;
		}

		textChannels.forEach((channel) => {
			sidebarItems.push(`     # ${channel.name}`);
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