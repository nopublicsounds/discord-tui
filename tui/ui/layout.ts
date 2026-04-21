import blessed from 'blessed';
import chalk from 'chalk';

import { createChatBox } from '../components/chatbox.js';
import { createInputBox } from '../components/inputbox.js';
import { createMentionBox } from '../components/mentionBox.js';
import { createSidebar } from '../components/sidebar.js';
import { createTitleBar, renderTitleBarContent } from '../components/titlebar.js';

export type AppLayout = {
	titleBar: blessed.Widgets.BoxElement;
	sidebar: blessed.Widgets.ListElement;
	chatBox: blessed.Widgets.Log;
	inputBox: blessed.Widgets.TextboxElement;
	mentionBox: blessed.Widgets.BoxElement;
	statusBar: blessed.Widgets.BoxElement;
};

export function createAppLayout(screen: blessed.Widgets.Screen): AppLayout {
	const titleBar = createTitleBar(screen);
	const sidebar = createSidebar(screen);
	const chatBox = createChatBox(screen);
	const inputBox = createInputBox(screen);
	const mentionBox = createMentionBox(screen);

	// Status bar (bottom left, under sidebar)
	const statusLabel = ' \u26a1  Status ';
	const statusBar = blessed.box({
		parent: screen,
		bottom: 0,
		left: 0,
		width: '25%',
		height: 3,
		border: { type: 'line' },
		style: {
			bg: '#2F3136',
			fg: '#72767D',
			border: { fg: '#202225' }
		},
		label: { text: statusLabel, side: 'left' } as any,
		align: 'center',
		valign: 'middle',
		content: chalk.hex('#72767D')('Not connected'),
		tags: false,
	});

	hideChatUI({ titleBar, sidebar, chatBox, inputBox, mentionBox, statusBar });

	return {
		titleBar,
		sidebar,
		chatBox,
		inputBox,
		mentionBox,
		statusBar,
	};
}

export function showChatUI(layout: AppLayout): void {
	layout.titleBar.show();
	layout.sidebar.show();
	layout.chatBox.show();
	layout.inputBox.show();
	layout.mentionBox.hide();
	layout.statusBar.show();
}

export function hideChatUI(layout: AppLayout): void {
	layout.sidebar.hide();
	layout.chatBox.hide();
	layout.inputBox.hide();
	layout.mentionBox.hide();
	layout.statusBar.hide();
}

export { renderTitleBarContent };