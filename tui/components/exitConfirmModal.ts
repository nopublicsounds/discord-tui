import blessed from 'blessed';
import chalk from 'chalk';

export function createExitConfirmModal(screen: blessed.Widgets.Screen) {
	const modal = blessed.box({
		parent: screen,
		top: 'center',
		left: 'center',
		width: 48,
		height: 7,
		border: { type: 'line' },
		style: {
			bg: '#202225',
			fg: '#DCDDDE',
			border: { fg: '#ED4245' }
		},
		label: { text: ' Exit Discord TUI ', side: 'left' } as any,
		align: 'center',
		valign: 'middle',
		content: `${chalk.hex('#DCDDDE')('Disconnect and exit?')}\n${chalk.hex('#99AAB5')('Enter: exit   Esc: cancel')}`,
		tags: true,
		keys: false,
		vi: false,
	});

	modal.hide();
	return modal;
}
