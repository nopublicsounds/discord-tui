import type { UIBridge } from '../ui/types.js';

export function setupKeyBindings(ui: Pick<UIBridge,
	'onGlobalKey' |
	'onSidebarKey' |
	'onInputKey' |
	'onInputKeypress' |
	'getChatHeight' |
	'scrollChat' |
	'render' |
	'focusInput' |
	'getInputValue' |
	'setInputBorderColor' |
	'isMentionSuggestionsVisible'
>){
	const scrollChat = (delta: number): void => {
		ui.scrollChat(delta);
		ui.render();
	};

	ui.onGlobalKey(['C-c'], () => {
		process.exit(0);
	});

	ui.onSidebarKey(['C-d'], () => {
		ui.focusInput();
		ui.render();
	});

	ui.onInputKey(['up'], () => {
		if (ui.isMentionSuggestionsVisible()) {
			return;
		}
		scrollChat(-1);
	});

	ui.onInputKey(['down'], () => {
		if (ui.isMentionSuggestionsVisible()) {
			return;
		}
		scrollChat(1);
	});

	ui.onInputKey(['pageup'], () => {
		scrollChat(-ui.getChatHeight());
	});

	ui.onInputKey(['pagedown'], () => {
		scrollChat(ui.getChatHeight());
	});

	ui.onInputKeypress((ch) => {
		const value = ui.getInputValue();
		if(value.startsWith('/') || ch === '/'){
			ui.setInputBorderColor('yellow');
		}

		else{
			ui.setInputBorderColor('#5865F2');
		}

		ui.render();
	});
}