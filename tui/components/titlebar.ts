import blessed from 'blessed';
import chalk from 'chalk';

export function createTitleBar(screen: blessed.Widgets.Screen): blessed.Widgets.BoxElement {
	const titleBar = blessed.box({
		parent: screen,
		top: 0,
		left: 0,
		width: '100%',
		height: 1,
		style: {
			fg: '#DCDDDE',
			bg: '#202225',
		},
		tags: false,
		content: chalk.bgHex('#202225').hex('#5865F2').bold(' ✦ Discord TUI ') +
			chalk.bgHex('#202225').hex('#4F545C')('  No channel selected'),
	});

	return titleBar;
}

export function renderTitleBarContent(
	serverName: string | null,
	channelName: string | null,
	status: 'connecting' | 'connected' | 'disconnected' = 'disconnected'
): string {
	const brand = chalk.bgHex('#202225').hex('#5865F2').bold(' ✦ Discord TUI ');
	const sep = chalk.bgHex('#202225').hex('#4F545C')(' │ ');

	let middle = chalk.bgHex('#202225').hex('#4F545C')(' No channel selected');
	if (serverName && channelName) {
		middle =
			chalk.bgHex('#202225').hex('#99AAB5')(` ${serverName} `) +
			chalk.bgHex('#202225').hex('#4F545C')('›') +
			chalk.bgHex('#202225').hex('#FFFFFF').bold(` #${channelName} `);
	} else if (channelName) {
		middle = chalk.bgHex('#202225').hex('#FFFFFF').bold(` #${channelName} `);
	}

	const statusIndicator =
		status === 'connected'
			? chalk.bgHex('#202225').hex('#57F287')('● Connected')
			: status === 'connecting'
			? chalk.bgHex('#202225').hex('#FEE75C')('● Connecting…')
			: chalk.bgHex('#202225').hex('#ED4245')('● Offline');

	return `${brand}${sep}${middle}${sep} ${statusIndicator} `;
}
