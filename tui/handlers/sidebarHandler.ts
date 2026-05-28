import { TextChannel } from 'discord.js';
import type { UIBridge } from '../ui/types.js';
import type { SelectableChannel } from '../utils/channelList.js';

function getNextSelectableIndex(currentIndex: number, totalItems: number, channelMap: Map<number, SelectableChannel>, step: 1 | -1): number {
	const selected = currentIndex;
	let nextIndex = (selected + step + totalItems) % totalItems;

	while (!channelMap.has(nextIndex) && nextIndex !== selected) {
		nextIndex = (nextIndex + step + totalItems) % totalItems;
	}

	return nextIndex;
}

export function setupSidebarHandlers(
	ui: Pick<UIBridge, 'onSidebarKey' | 'selectSidebar' | 'getSidebarSelectedIndex' | 'focusInput' | 'render'>,
	channelMap: Map<number, SelectableChannel>,
	itemCount: number,
	onChannelSelect: (channel: SelectableChannel) => Promise<void>
): void {
	ui.onSidebarKey(['down'], () => {
		const current = ui.getSidebarSelectedIndex();
		ui.selectSidebar(getNextSelectableIndex(current, itemCount, channelMap, 1));
		ui.render();
	});

	ui.onSidebarKey(['up'], () => {
		const current = ui.getSidebarSelectedIndex();
		ui.selectSidebar(getNextSelectableIndex(current, itemCount, channelMap, -1));
		ui.render();
	});

	ui.onSidebarKey(['enter'], async () => {
		const selected = ui.getSidebarSelectedIndex();
		const channel = channelMap.get(selected);
		if (!channel) {
			return;
		}

		await onChannelSelect(channel);
		setImmediate(() => {
			ui.focusInput();
			ui.render();
		});
	});
}