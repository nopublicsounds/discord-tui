import blessed from 'blessed';

export function createChatBox(screen: blessed.Widgets.Screen){
	const chatBox = blessed.log({
		parent: screen,
		top: 1,
		left: '25%',
		width: '75%',
		height: '100%-4',
		border: {
			type: 'line'
		},
		style: {
			bg: '#36393F',
			fg: '#DCDDDE',
			border: {
				fg: '#202225'
			}
		},
		label: {
			text: ' 💬  Chat ',
			side: 'left'
		} as any,
		scrollable: true,
		scrollbar: {
			ch: '▊',
			style: {
				fg: '#5865F2',
				bg: '#2F3136'
			}
		},
		alwaysScroll: true,
		wrap: true,
		tags: false,
		unicode: true,
	});

	return chatBox;
}