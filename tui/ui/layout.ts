import blessed from 'blessed';
import chalk from 'chalk';
import gradient from 'gradient-string';

import { createChatBox } from '../components/chatbox.js';
import { createInputBox } from '../components/inputbox.js';
import { LOGO } from '../components/logo.js';
import { createSidebar } from '../components/sidebar.js';
import { createTitleBar, renderTitleBarContent } from '../components/titlebar.js';

export type AppLayout = {
	titleBar: blessed.Widgets.BoxElement;
	sidebar: blessed.Widgets.ListElement;
	chatBox: blessed.Widgets.Log;
	inputBox: blessed.Widgets.TextboxElement;
	statusBar: blessed.Widgets.BoxElement;
	launcher: blessed.Widgets.BoxElement;
};

export function createAppLayout(screen: blessed.Widgets.Screen): AppLayout {
	const titleBar = createTitleBar(screen);
	const sidebar = createSidebar(screen);
	const chatBox = createChatBox(screen);
	const inputBox = createInputBox(screen);

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

	const coloredLogo = gradient(['#5865F2', '#EB459E']).multiline(LOGO);
	const launcher = blessed.box({
		parent: screen,
		top: 'center',
		left: 'center',
		width: 'shrink',
		height: 'shrink',
		align: 'center',
		valign: 'middle',
		style: {
			bg: '#2F3136',
		},
		padding: { left: 4, right: 4, top: 1, bottom: 1 },
		border: { type: 'line' },
		content: [
			coloredLogo,
			'',
			chalk.hex('#57F287').bold('  [ Enter ]  ') + chalk.hex('#DCDDDE')('Start chat client'),
			chalk.hex('#FEE75C').bold('  [  s  ]  ') + chalk.hex('#DCDDDE')('Run setup (save token)'),
			chalk.hex('#ED4245').bold('  [ Ctrl+C ]  ') + chalk.hex('#DCDDDE')('Exit'),
			'',
			chalk.hex('#4F545C')('─'.repeat(46)),
			chalk.hex('#72767D')('  ↑/↓  Scroll  •  PgUp/PgDn  Fast scroll'),
			chalk.hex('#72767D')('  Ctrl+D  Switch focus  •  /help  Commands'),
		].join('\n')
	});

	hideChatUI({ titleBar, sidebar, chatBox, inputBox, statusBar, launcher });

	return {
		titleBar,
		sidebar,
		chatBox,
		inputBox,
		statusBar,
		launcher
	};
}

export function showChatUI(layout: AppLayout): void {
	layout.launcher.hide();
	layout.titleBar.show();
	layout.sidebar.show();
	layout.chatBox.show();
	layout.inputBox.show();
	layout.statusBar.show();
}

export function hideChatUI(layout: AppLayout): void {
	layout.sidebar.hide();
	layout.chatBox.hide();
	layout.inputBox.hide();
	layout.statusBar.hide();
}

export { renderTitleBarContent };