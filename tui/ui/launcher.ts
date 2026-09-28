import blessed from 'blessed';
import gradient from 'gradient-string';

import { LOGO } from '../components/logo.js';

export type LauncherResult = 'start' | 'setup' | 'exit';

export function showLauncher(): Promise<LauncherResult> {
	return new Promise((resolve) => {
		const screen = blessed.screen({
			smartCSR: true,
			title: 'Discord TUI',
			fullUnicode: true,
			trueColor: true,
		});
		let completed = false;
		let logoAnimation: NodeJS.Timeout | undefined;

		const complete = (result: LauncherResult): void => {
			if (completed) {
				return;
			}

			completed = true;
			if (logoAnimation) {
				clearInterval(logoAnimation);
			}
			screen.destroy();
			process.stdout.write('\x1b[2J\x1b[0;0H');
			resolve(result);
		};

		const launcherBox = blessed.box({
			parent: screen,
			top: 'center',
			left: 'center',
			width: 104,
			height: 20,
			border: 'line',
			label: ' Discord TUI ',
			style: {
				border: { fg: '#FFFFFF' }
			}
		});

		const logoBox = blessed.box({
			parent: launcherBox,
			top: 1,
			left: 4,
			width: '100%-8',
			height: 6,
		});

		blessed.line({
			parent: launcherBox,
			top: 8,
			left: 4,
			width: '100%-8',
			orientation: 'horizontal',
			type: 'line',
			style: { fg: '#4F545C' }
		});

		blessed.box({
			parent: launcherBox,
			top: 10,
			left: 4,
			width: '100%-8',
			height: 8,
			tags: true,
			content: [
			'{#57F287-fg}{bold}  [ Enter ]   {/bold}{/#57F287-fg}Start chat client',
			'{#FEE75C-fg}{bold}  [  s  ]     {/bold}{/#FEE75C-fg}Run setup (save token)',
			'{#ED4245-fg}{bold}  [ Ctrl+C ]  {/bold}{/#ED4245-fg}Exit',
			'',
			'{#72767D-fg}  ↑/↓  Scroll  •  PgUp/PgDn  Fast scroll{/#72767D-fg}',
			'{#72767D-fg}  Ctrl+D  Switch focus  •  /help  Commands{/#72767D-fg}',
			].join('\n'),
		});

		const logoLines = LOGO.trim().split('\n');
		const logoWidth = Math.max(...logoLines.map((line) => line.length));
		let visibleColumns = 0;
		logoAnimation = setInterval(() => {
			visibleColumns = Math.min(visibleColumns + 2, logoWidth);
			logoBox.setContent(
				logoLines
					.map((line) => gradient(['#5865F2', '#EB459E']).multiline(line.slice(0, visibleColumns)))
					.join('\n')
			);
			screen.render();

			if (visibleColumns === logoWidth && logoAnimation) {
				clearInterval(logoAnimation);
				logoAnimation = undefined;
			}
		}, 20);

		screen.key(['C-c'], () => {
			complete('exit');
		});
		screen.key(['enter'], () => {
			complete('start');
		});
		screen.key(['s'], () => {
			complete('setup');
		});

		screen.render();
	});
}
