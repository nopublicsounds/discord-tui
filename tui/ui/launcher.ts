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

		const complete = (result: LauncherResult): void => {
			if (completed) {
				return;
			}

			completed = true;
			screen.destroy();
			process.stdout.write('\x1b[2J\x1b[0;0H');
			resolve(result);
		};

		const content = [
			gradient(['#5865F2', '#EB459E']).multiline(LOGO),
			'',
			'{#57F287-fg}{bold}  [ Enter ]   {/bold}{/#57F287-fg}Start chat client',
			'{#FEE75C-fg}{bold}  [  s  ]     {/bold}{/#FEE75C-fg}Run setup (save token)',
			'{#ED4245-fg}{bold}  [ Ctrl+C ]  {/bold}{/#ED4245-fg}Exit',
			'',
			'{#4F545C-fg}──────────────────────────────────────────────{/#4F545C-fg}',
			'{#72767D-fg}  ↑/↓  Scroll  •  PgUp/PgDn  Fast scroll{/#72767D-fg}',
			'{#72767D-fg}  Ctrl+D  Switch focus  •  /help  Commands{/#72767D-fg}',
		].join('\n');

		blessed.box({
			parent: screen,
			top: 'center',
			left: 'center',
			width: 'shrink',
			height: 'shrink',
			border: 'line',
			padding: { left: 4, right: 4, top: 1, bottom: 1 },
			content,
			tags: true,
		});

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
