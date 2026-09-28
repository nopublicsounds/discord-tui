import { describe, expect, it, vi } from 'vitest';

import { setupKeyBindings } from '../tui/handlers/keyHandler.js';

describe('setupKeyBindings', () => {
	it('toggles focus between the sidebar and input with Ctrl-D', async () => {
		const sidebarKeys = new Map<string, () => void | Promise<void>>();
		const inputKeys = new Map<string, () => void | Promise<void>>();
		const globalKeys = new Map<string, () => void | Promise<void>>();
		const exitConfirmationKeys = new Map<string, () => void | Promise<void>>();
		const ui = {
			onGlobalKey: vi.fn((keys: string[], handler: () => void | Promise<void>) => {
				for (const key of keys) {
					globalKeys.set(key, handler);
				}
			}),
			onAttachmentKey: vi.fn(),
			onExitConfirmationKey: vi.fn((keys: string[], handler: () => void | Promise<void>) => {
				for (const key of keys) {
					exitConfirmationKeys.set(key, handler);
				}
			}),
			onInputKeypress: vi.fn(),
			onSidebarKey: vi.fn((keys: string[], handler: () => void | Promise<void>) => {
				for (const key of keys) {
					sidebarKeys.set(key, handler);
				}
			}),
			onInputKey: vi.fn((keys: string[], handler: () => void | Promise<void>) => {
				for (const key of keys) {
					inputKeys.set(key, handler);
				}
			}),
			focusInput: vi.fn(),
			focusSidebar: vi.fn(),
			render: vi.fn(),
			getInputValue: vi.fn(() => ''),
			setInputBorderColor: vi.fn(),
			isMentionSuggestionsVisible: vi.fn(() => false),
			scrollChat: vi.fn(),
			getChatHeight: vi.fn(() => 10),
			hideAttachmentModal: vi.fn(),
			scrollAttachmentModal: vi.fn(),
			getAttachmentModalHeight: vi.fn(() => 10),
			showExitConfirmation: vi.fn(),
			hideExitConfirmation: vi.fn(),
		};
		const onExit = vi.fn();

		setupKeyBindings(ui, onExit);

		await sidebarKeys.get('C-d')?.();
		expect(ui.focusInput).toHaveBeenCalledOnce();

		await inputKeys.get('C-d')?.();
		expect(ui.focusSidebar).toHaveBeenCalledOnce();
		expect(ui.render).toHaveBeenCalledTimes(2);

		await inputKeys.get('C-c')?.();
		expect(ui.showExitConfirmation).toHaveBeenCalledOnce();

		await globalKeys.get('C-c')?.();
		expect(ui.showExitConfirmation).toHaveBeenCalledTimes(2);

		await exitConfirmationKeys.get('escape')?.();
		expect(ui.hideExitConfirmation).toHaveBeenCalledOnce();

		await exitConfirmationKeys.get('enter')?.();
		expect(onExit).toHaveBeenCalledOnce();
	});
});
