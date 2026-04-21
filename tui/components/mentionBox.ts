import blessed from 'blessed';

export function createMentionBox(screen: blessed.Widgets.Screen) {
	const mentionBox = blessed.box({
		parent: screen,
		left: '25%',
		bottom: 3,
		width: '75%',
		height: 8,
		border: {
			type: 'line'
		},
		style: {
			bg: '#2B2D31',
			fg: '#DCDDDE',
			border: {
				fg: '#5865F2'
			}
		},
		label: {
			text: ' @ Mention ',
			side: 'left'
		} as any,
		tags: false,
		padding: {
			left: 1,
			right: 1,
			top: 0,
			bottom: 0,
		},
		content: '',
	});

	mentionBox.hide();
	return mentionBox;
}
