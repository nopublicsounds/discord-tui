import type { Widgets } from 'blessed';

export function setupKeyBindings(screen: Widgets.Screen, sidebar: Widgets.ListElement, chatBox: Widgets.Log, inputBox: Widgets.TextboxElement){
	screen.key(['C-c'], () => {
		process.exit(0);
	});

	sidebar.key(['C-d'], () => {
		inputBox.focus();
		screen.render();
	});

	inputBox.key(['up'], () => {
		chatBox.scroll(-1);
		screen.render();
	});

	inputBox.key(['down'], () => {
		chatBox.scroll(1);
		screen.render();
	});

	inputBox.key(['pageup'], () => {
		chatBox.scroll(-(chatBox.height as number));
		screen.render();
	});

	inputBox.key(['pagedown'], () => {
		chatBox.scroll(chatBox.height as number);
		screen.render();
	});

	inputBox.on('keypress', (ch) => {
		const value = inputBox.getValue();
		if(value.startsWith('/') || ch === '/'){
			inputBox.style.border.fg = 'yellow';
		}

		else{
			inputBox.style.border.fg = '#5865F2';
		}

		screen.render();
	});
}