import blessed from 'blessed';
import chalk from 'chalk';

import { createChatBox } from '../components/chatbox.js';
import { createInputBox } from '../components/inputbox.js';
import { LOGO } from '../components/logo.js';
import { createSidebar } from '../components/sidebar.js';
import { createGradientLogo } from '../utils/logoGradient.js';

export type AppLayout = {
	sidebar: blessed.Widgets.ListElement;
	chatBox: blessed.Widgets.Log;
	inputBox: blessed.Widgets.TextboxElement;
	helpBox: blessed.Widgets.BoxElement;
	launcher: blessed.Widgets.BoxElement;
};

export function createAppLayout(screen: blessed.Widgets.Screen): AppLayout {
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
	const coloredLogo = createGradientLogo(LOGO, '#5865F2', '#8458f2', (color, text) => chalk.hex(color)(text));
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

	hideChatUI({ sidebar, chatBox, inputBox, helpBox, launcher });

	return {
		sidebar,
		chatBox,
		inputBox,
		helpBox,
		launcher
	};
}

export function showChatUI(layout: AppLayout): void {
	layout.launcher.hide();
	layout.sidebar.show();
	layout.chatBox.show();
	layout.inputBox.show();
	layout.helpBox.show();
}

export function hideChatUI(layout: AppLayout): void {
	layout.sidebar.hide();
	layout.chatBox.hide();
	layout.inputBox.hide();
	layout.helpBox.hide();
}