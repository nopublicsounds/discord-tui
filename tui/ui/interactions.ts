import type blessed from 'blessed';

import type { AppLayout } from './layout.js';
import type { KeyHandler } from './types.js';

type FocusTarget = 'input' | 'sidebar' | 'attachment' | 'exitConfirmation';

type KeyableElement = {
	enableKeys(): void;
	on(event: string, listener: () => void): unknown;
	focus(): void;
};

type InputElement = KeyableElement & {
	readInput(): void;
};

function bindFocusedKeys(element: KeyableElement, keys: string[], handler: KeyHandler): void {
	element.enableKeys();
	const safeHandler = (): void => {
		void Promise.resolve(handler());
	};

	for (const key of keys) {
		element.on(`key ${key}`, safeHandler);
	}
}

export function createBlessedInteractionController(layout: AppLayout) {
	let activeFocus: FocusTarget = 'input';
	let focusBeforeAttachment: Exclude<FocusTarget, 'attachment'> = 'input';
	let focusBeforeExitConfirmation: FocusTarget = 'input';

	const focus = (target: FocusTarget): void => {
		activeFocus = target;
		switch (target) {
			case 'input':
				layout.inputBox.focus();
				return;
			case 'sidebar':
				layout.sidebar.focus();
				return;
			case 'attachment':
				layout.attachmentModal.focus();
				return;
			case 'exitConfirmation':
				layout.exitConfirmModal.focus();
		}
	};

	const focusInput = (): void => {
		focus('input');
		(layout.inputBox as InputElement).readInput();
	};

	const focusSidebar = (): void => {
		focus('sidebar');
	};

	const focusAttachment = (): void => {
		if (activeFocus !== 'attachment') {
			focusBeforeAttachment = activeFocus;
		}
		focus('attachment');
	};

	const restoreFocusAfterAttachment = (): void => {
		restoreFocus(focusBeforeAttachment);
	};

	const focusExitConfirmation = (): void => {
		if (activeFocus !== 'exitConfirmation') {
			focusBeforeExitConfirmation = activeFocus;
		}
		focus('exitConfirmation');
	};

	const restoreFocusAfterExitConfirmation = (): void => {
		restoreFocus(focusBeforeExitConfirmation);
	};

	const restoreFocus = (target: FocusTarget): void => {
		switch (target) {
			case 'input':
				focusInput();
				return;
			case 'sidebar':
				focusSidebar();
				return;
			case 'attachment':
				focusAttachment();
				return;
			case 'exitConfirmation':
				focusExitConfirmation();
		}
	};

	return {
		focusInput,
		focusSidebar,
		focusAttachment,
		restoreFocusAfterAttachment,
		focusExitConfirmation,
		restoreFocusAfterExitConfirmation,
		onSidebarKey(keys: string[], handler: KeyHandler): void {
			bindFocusedKeys(layout.sidebar, keys, handler);
		},
		onInputKey(keys: string[], handler: KeyHandler): void {
			bindFocusedKeys(layout.inputBox, keys, handler);
		},
		onAttachmentKey(keys: string[], handler: KeyHandler): void {
			bindFocusedKeys(layout.attachmentModal, keys, handler);
		},
		onExitConfirmationKey(keys: string[], handler: KeyHandler): void {
			bindFocusedKeys(layout.exitConfirmModal, keys, handler);
		}
	};
}
