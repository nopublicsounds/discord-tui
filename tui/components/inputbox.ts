import blessed from 'blessed';

export function createInputBox(screen: blessed.Widgets.Screen){
	const inputBox = blessed.textbox({
		parent: screen,
		name: 'inputBox',
		bottom: 0,
		left: '25%',
		width: '75%',
		height: 3,
		border: {
			type: 'line'
		},
		label: ' ✦ No channel selected ',
		style: {
			bg: '#40444B',
			fg: '#DCDDDE',
			border: {
				fg: '#202225'
			},
			focus: {
				border: {
					fg: '#5865F2'
				}
			}
		},
		keys: true,
		inputOnFocus: true
	});

	inputBox.on('keypress', (ch, key) => {
		if (key.ctrl && key.name === 'd'){
			inputBox.cancel();
			return false;
		}
	});
	return inputBox;
}