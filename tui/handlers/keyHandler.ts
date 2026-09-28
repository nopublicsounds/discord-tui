import type { UIBridge } from '../ui/types.js';

export function setupKeyBindings(ui: Pick<UIBridge,
	'onGlobalKey' |
	'onSidebarKey' |
	'onInputKey' |
	'onAttachmentKey' |
	'onExitConfirmationKey' |
	'onInputKeypress' |
	'getChatHeight' |
	'scrollChat' |
	'render' |
	'focusInput' |
	'focusSidebar' |
	'getInputValue' |
	'setInputBorderColor' |
	'isMentionSuggestionsVisible' |
	'hideAttachmentModal' |
	'showExitConfirmation' |
	'hideExitConfirmation' |
	'scrollAttachmentModal' |
	'getAttachmentModalHeight'
>, onExit?: () => void){
	const scrollChat = (delta: number): void => {
		ui.scrollChat(delta);
		ui.render();
	};

	ui.onGlobalKey(['C-c'], () => {
		ui.showExitConfirmation();
		ui.render();
	});

	ui.onInputKey(['C-c'], () => {
		ui.showExitConfirmation();
		ui.render();
	});

	ui.onExitConfirmationKey(['enter'], () => {
		if (onExit) {
			onExit();
			return;
		}

		process.exit(0);
	});

	ui.onExitConfirmationKey(['escape'], () => {
		ui.hideExitConfirmation();
		ui.render();
	});

	ui.onAttachmentKey(['escape'], () => {
		ui.hideAttachmentModal();
		ui.render();
	});

	ui.onAttachmentKey(['up'], () => {
		ui.scrollAttachmentModal(-1);
		ui.render();
	});

	ui.onAttachmentKey(['down'], () => {
		ui.scrollAttachmentModal(1);
		ui.render();
	});

	ui.onAttachmentKey(['pageup'], () => {
		ui.scrollAttachmentModal(-ui.getAttachmentModalHeight());
		ui.render();
	});

	ui.onAttachmentKey(['pagedown'], () => {
		ui.scrollAttachmentModal(ui.getAttachmentModalHeight());
		ui.render();
	});

	ui.onSidebarKey(['C-d'], () => {
		ui.focusInput();
		ui.render();
	});

	ui.onInputKey(['C-d'], () => {
		ui.focusSidebar();
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