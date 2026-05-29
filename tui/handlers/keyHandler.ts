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
	'isMentionSuggestionsVisible' |
	'isAttachmentModalVisible' |
	'hideAttachmentModal' |
	'scrollAttachmentModal' |
	'getAttachmentModalHeight'
>){
	const scrollChat = (delta: number): void => {
		ui.scrollChat(delta);
		ui.render();
	};

	ui.onGlobalKey(['C-c'], () => {
		process.exit(0);
	});

	ui.onGlobalKey(['escape'], () => {
		if (!ui.isAttachmentModalVisible()) {
			return;
		}
		ui.hideAttachmentModal();
		ui.render();
	});

	ui.onGlobalKey(['up'], () => {
		if (!ui.isAttachmentModalVisible()) {
			return;
		}
		ui.scrollAttachmentModal(-1);
		ui.render();
	});

	ui.onGlobalKey(['down'], () => {
		if (!ui.isAttachmentModalVisible()) {
			return;
		}
		ui.scrollAttachmentModal(1);
		ui.render();
	});

	ui.onGlobalKey(['pageup'], () => {
		if (!ui.isAttachmentModalVisible()) {
			return;
		}
		ui.scrollAttachmentModal(-ui.getAttachmentModalHeight());
		ui.render();
	});

	ui.onGlobalKey(['pagedown'], () => {
		if (!ui.isAttachmentModalVisible()) {
			return;
		}
		ui.scrollAttachmentModal(ui.getAttachmentModalHeight());
		ui.render();
	});

	ui.onInputKey(['escape'], () => {
		if (!ui.isAttachmentModalVisible()) {
			return;
		}
		ui.hideAttachmentModal();
		ui.render();
	});

	ui.onSidebarKey(['C-d'], () => {
		ui.focusInput();
		ui.render();
	});

	ui.onInputKey(['up'], () => {
		if (ui.isAttachmentModalVisible()) {
			return;
		}
		if (ui.isMentionSuggestionsVisible()) {
			return;
		}
		scrollChat(-1);
	});

	ui.onInputKey(['down'], () => {
		if (ui.isAttachmentModalVisible()) {
			return;
		}
		if (ui.isMentionSuggestionsVisible()) {
			return;
		}
		scrollChat(1);
	});

	ui.onInputKey(['pageup'], () => {
		if (ui.isAttachmentModalVisible()) {
			return;
		}
		scrollChat(-ui.getChatHeight());
	});

	ui.onInputKey(['pagedown'], () => {
		if (ui.isAttachmentModalVisible()) {
			return;
		}
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