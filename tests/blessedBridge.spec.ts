import { beforeEach, describe, expect, it, vi } from 'vitest';

const mocks = vi.hoisted(() => ({
	inputBox: {
		enableKeys: vi.fn(),
		focus: vi.fn(),
		on: vi.fn(),
		key: vi.fn(),
		readInput: vi.fn(),
	},
	sidebar: {
		enableKeys: vi.fn(),
		focus: vi.fn(),
		on: vi.fn(),
		key: vi.fn(),
	},
	attachmentModal: {
		focus: vi.fn(),
		hide: vi.fn(),
		setContent: vi.fn(),
		setLabel: vi.fn(),
		setScroll: vi.fn(),
		show: vi.fn(),
	},
	exitConfirmModal: {
		enableKeys: vi.fn(),
		focus: vi.fn(),
		hide: vi.fn(),
		on: vi.fn(),
		show: vi.fn(),
	},
}));

vi.mock('../tui/ui/layout.js', () => ({
	createAppLayout: () => ({
		inputBox: mocks.inputBox,
		sidebar: mocks.sidebar,
		attachmentModal: mocks.attachmentModal,
		exitConfirmModal: mocks.exitConfirmModal,
	}),
	hideChatUI: vi.fn(),
	renderTitleBarContent: vi.fn(),
	showChatUI: vi.fn(),
}));

import { createBlessedUIBridge } from '../tui/ui/blessedBridge.js';

describe('createBlessedUIBridge key bindings', () => {
	beforeEach(() => {
		vi.clearAllMocks();
	});

	it('binds sidebar keys to the focused sidebar instead of the global program', async () => {
		const handler = vi.fn();
		const screen = { enableKeys: vi.fn() };
		const ui = createBlessedUIBridge(screen as never);

		ui.onSidebarKey(['up', 'down'], handler);

		expect(mocks.sidebar.enableKeys).toHaveBeenCalledOnce();
		expect(mocks.sidebar.on).toHaveBeenCalledWith('key up', expect.any(Function));
		expect(mocks.sidebar.on).toHaveBeenCalledWith('key down', expect.any(Function));
		expect(mocks.sidebar.key).not.toHaveBeenCalled();

		const keyUpHandler = mocks.sidebar.on.mock.calls[0][1] as () => void;
		keyUpHandler();
		await Promise.resolve();
		expect(handler).toHaveBeenCalledOnce();
	});

	it('binds input keys to the focused input instead of the global program', async () => {
		const handler = vi.fn();
		const screen = { enableKeys: vi.fn() };
		const ui = createBlessedUIBridge(screen as never);

		ui.onInputKey(['up', 'down'], handler);

		expect(mocks.inputBox.enableKeys).toHaveBeenCalledOnce();
		expect(mocks.inputBox.on).toHaveBeenCalledWith('key up', expect.any(Function));
		expect(mocks.inputBox.on).toHaveBeenCalledWith('key down', expect.any(Function));
		expect(mocks.inputBox.key).not.toHaveBeenCalled();

		const keyDownHandler = mocks.inputBox.on.mock.calls[1][1] as () => void;
		keyDownHandler();
		await Promise.resolve();
		expect(handler).toHaveBeenCalledOnce();
	});

	it('restores the focus that preceded an attachment modal', () => {
		const ui = createBlessedUIBridge({} as never);

		ui.focusSidebar();
		ui.showAttachmentModal('Attachments', ['file.txt']);
		ui.hideAttachmentModal();

		expect(mocks.sidebar.focus).toHaveBeenCalledTimes(2);
		expect(mocks.attachmentModal.focus).toHaveBeenCalledOnce();
		expect(mocks.inputBox.focus).not.toHaveBeenCalled();
	});

	it('restores focus after cancelling exit confirmation', () => {
		const ui = createBlessedUIBridge({} as never);

		ui.focusSidebar();
		ui.showExitConfirmation();
		ui.hideExitConfirmation();

		expect(mocks.exitConfirmModal.show).toHaveBeenCalledOnce();
		expect(mocks.exitConfirmModal.focus).toHaveBeenCalledOnce();
		expect(mocks.exitConfirmModal.hide).toHaveBeenCalledOnce();
		expect(mocks.sidebar.focus).toHaveBeenCalledTimes(2);
	});

	it('starts one input session when restoring input focus', () => {
		const ui = createBlessedUIBridge({} as never);

		ui.focusInput();
		ui.showExitConfirmation();
		ui.hideExitConfirmation();

		expect(mocks.inputBox.readInput).toHaveBeenCalledTimes(2);
	});
});
