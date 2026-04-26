import { Box, Text, render, useApp, useInput } from 'ink';
import React from 'react';
import gradient from 'gradient-string';

import { LOGO } from '../components/logo.js';

export type LauncherResult = 'start' | 'setup' | 'exit';

function LauncherApp({ onDone }: { onDone: (result: LauncherResult) => void }) {
	const { exit } = useApp();

	const logoLines = gradient(['#5865F2', '#EB459E']).multiline(LOGO).split('\n');

	useInput((input, key) => {
		if (key.ctrl && input === 'c') {
			onDone('exit');
			exit();
		} else if (key.return) {
			onDone('start');
			exit();
		} else if (input === 's') {
			onDone('setup');
			exit();
		}
	});

	return (
		<Box justifyContent="center">
			<Box flexDirection="column" borderStyle="round" paddingX={4} paddingY={1}>
			<Box flexDirection="column">
				{logoLines.map((line, i) => (
					<Text key={i}>{line}</Text>
				))}
			</Box>
			<Text> </Text>
			<Text>
				<Text color="#57F287" bold>{'  [ Enter ]   '}</Text>
				<Text color="#DCDDDE">Start chat client</Text>
			</Text>
			<Text>
				<Text color="#FEE75C" bold>{'  [  s  ]     '}</Text>
				<Text color="#DCDDDE">Run setup (save token)</Text>
			</Text>
			<Text>
				<Text color="#ED4245" bold>{'  [ Ctrl+C ]  '}</Text>
				<Text color="#DCDDDE">Exit</Text>
			</Text>
			<Text> </Text>
			<Text color="#4F545C">{'─'.repeat(46)}</Text>
			<Text color="#72767D">{'  ↑/↓  Scroll  •  PgUp/PgDn  Fast scroll'}</Text>
			<Text color="#72767D">{'  Ctrl+D  Switch focus  •  /help  Commands'}</Text>
		</Box>
		</Box>
	);
}

export function showLauncher(): Promise<LauncherResult> {
	return new Promise((resolve) => {
		let result: LauncherResult = 'start';

		const instance = render(
			<LauncherApp onDone={(r) => { result = r; }} />,
			{ exitOnCtrlC: false }
		);

		void instance.waitUntilExit().then(() => {
			instance.clear();
			process.stdout.write('\x1b[2J\x1b[0;0H');
			resolve(result);
		});
	});
}
