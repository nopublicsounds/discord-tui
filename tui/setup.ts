import blessed from 'blessed';
import fs from 'fs';
import chalk from 'chalk';
import { pathToFileURL, fileURLToPath } from 'url';
import path from 'path';

const __dirname = path.dirname(fileURLToPath(import.meta.url));

export function runSetup(): Promise<void> {
	return new Promise((resolve) => {
		const keepAlive = setInterval(() => {}, 1000);

		const done = () => {
            clearInterval(keepAlive);
            screen.destroy();
            resolve();
        };

		const screen = blessed.screen({
			smartCSR: true,
			title: 'Discord TUI Setup',
			fullUnicode: true,
			mouse: true,
			input: process.stdin,
			output: process.stdout
		});

		const titleBox = blessed.box({
			parent: screen,
			top: 2,
			left: 'center',
			width: 'shrink',
			height: 'shrink',
			align: 'center',
			valign: 'middle',
			content: chalk.hex('#5865F2').bold('🤖 Discord TUI Setup'),
			tags: false
		});

		const descBox = blessed.box({
			parent: screen,
			top: 4,
			left: 'center',
			width: 60,
			height: 'shrink',
			align: 'center',
			valign: 'middle',
			content: 'Please enter your Discord bot token below:',
			tags: false,
			style: {
				fg: '#99AAB5'
			}
		});

		const inputBox = blessed.textbox({
			parent: screen,
			top: 7,
			left: 'center',
			width: 60,
			height: 3,
			border: 'line',
			label: ' Token ',
			style: {
				border: {
					fg: '#5865F2'
				},
				focus: {
					border: {
						fg: '#00FF00'
					}
				}
			},
			keys: true,
			inputOnFocus: true,
			vi: false
		});

		const instructionBox = blessed.box({
			parent: screen,
			top: 11,
			left: 'center',
			width: 60,
			height: 'shrink',
			align: 'center',
			valign: 'middle',
			content: chalk.hex('#99AAB5')('Press {#00FF00-fg}ENTER{/#00FF00-fg} to save • Press {#FF0000-fg}ESC{/#FF0000-fg} to cancel'),
			tags: true
		});

		const statusBox = blessed.box({
			parent: screen,
			top: 13,
			left: 'center',
			width: 'shrink',
			height: 'shrink',
			align: 'center',
			valign: 'middle',
			content: '',
			tags: true
		});

		inputBox.focus();

		inputBox.on('submit', (value) => {
			const trimmed = value.trim();

			if (!trimmed) {
				statusBox.setContent(chalk.hex('#FF0000')('❌ Token is empty. Setup cancelled.'));
				screen.render();
				setTimeout(() => {
					screen.destroy();
					resolve();
				}, 1500);
				return;
			}

			const envPath = path.resolve(__dirname, '..', '..', '.env');

			try {
				fs.writeFileSync(envPath, `DISCORD_TOKEN=${trimmed}\n`);
				statusBox.setContent(chalk.hex('#00FF00')(`✅ .env file created at ${envPath}`));
				screen.render();
				setTimeout(() => {
					screen.destroy();
					resolve();
				}, 1500);
			} catch (error) {
				statusBox.setContent(chalk.hex('#FF0000')('❌ Error writing .env file'));
				screen.render();
				setTimeout(() => {
					screen.destroy();
					resolve();
				}, 1500);
			}

			setTimeout(done, 1500);
		});

		inputBox.on('cancel', () => {
			statusBox.setContent(chalk.hex('#FF0000')('❌ Setup cancelled.'));
			screen.render();
			setTimeout(() => {
				screen.destroy();
				resolve();
			}, 1000);

			setTimeout(done, 1000);
		});

		screen.key(['escape', 'q', 'C-c'], () => {
			statusBox.setContent(chalk.hex('#FF0000')('❌ Setup cancelled.'));
			screen.render();
			setTimeout(() => {
				screen.destroy();
				resolve();
			}, 1000);

			setTimeout(done, 1000);
		});

		screen.render();
	});
}

const isDirectRun = process.argv[1] !== undefined
	&& import.meta.url === pathToFileURL(process.argv[1]).href;

if (isDirectRun) {
	void runSetup();
}