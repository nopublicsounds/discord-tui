import { TextChannel } from 'discord.js';
import type { UIBridge } from '../ui/types.js';
import { safeChannelName } from '../utils/uiText.js';

function getNextSelectableIndex(currentIndex: number, totalItems: number, channelMap: Map<number, TextChannel>, step: 1 | -1): number {
	const selected = currentIndex;
	let nextIndex = (selected + step + totalItems) % totalItems;

	while (!channelMap.has(nextIndex) && nextIndex !== selected) {
		nextIndex = (nextIndex + step + totalItems) % totalItems;
	}

	return nextIndex;
}

export function setupSidebarHandlers(
	ui: Pick<UIBridge, 'onSidebarKey' | 'selectSidebar' | 'getSidebarSelectedIndex' | 'setInputLabel' | 'focusInput' | 'render'>,
	channelMap: Map<number, TextChannel>,
	itemCount: number,
	onChannelSelect: (channel: TextChannel) => Promise<void>
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

		ui.setInputLabel(` # ${safeChannelName(channel.name)} `);
		await onChannelSelect(channel);
		setImmediate(() => {
			ui.focusInput();
			ui.render();
		});
	});
}