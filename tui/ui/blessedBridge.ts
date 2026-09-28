import type blessed from 'blessed';
import chalk from 'chalk';

import { createBlessedInteractionController } from './interactions.js';
import { createAppLayout, hideChatUI, renderTitleBarContent, showChatUI } from './layout.js';
import type { KeyHandler, UIBridge } from './types.js';

export function createBlessedUIBridge(screen: blessed.Widgets.Screen): UIBridge {
	const layout = createAppLayout(screen);
	const interactions = createBlessedInteractionController(layout);

	const safeAsync = (handler: KeyHandler): (() => void) => {
		return () => {
			void Promise.resolve(handler());
		};
	};

	return {
		render(): void {
			screen.render();
		},

		showChatUI(): void {
			showChatUI(layout);
		},

		hideChatUI(): void {
			hideChatUI(layout);
		},

		clearChat(): void {
			const logWidget = layout.chatBox as blessed.Widgets.Log & {
				resetScroll?: () => void;
			};

			layout.chatBox.setContent('');
			logWidget.resetScroll?.();
		},

		hardRefresh(): void {
			const screenWithRealloc = screen as blessed.Widgets.Screen & { realloc?: () => void };
			screenWithRealloc.realloc?.();
		},

		appendChat(line: string): void {
			layout.chatBox.log(line);
		},

		setChatContent(content: string): void {
			layout.chatBox.setContent(content);
		},

		setChatLabel(label: string): void {
			layout.chatBox.setLabel(label);
		},

		clearInput(): void {
			layout.inputBox.clearValue();
		},

		getInputValue(): string {
			return layout.inputBox.getValue();
		},

		setInputValue(value: string): void {
			layout.inputBox.setValue(value);
		},

		focusInput(): void {
			interactions.focusInput();
		},

		focusSidebar(): void {
			interactions.focusSidebar();
		},

		setInputLabel(label: string): void {
			layout.inputBox.setLabel(` ✦ ${label} `);
		},

		setInputBorderColor(color: string): void {
			layout.inputBox.style.border.fg = color;
		},

		showMentionSuggestions(items: string[], selectedIndex: number): void {
			const rendered = items.map((item, index) => {
				if (index === selectedIndex) {
					return chalk.bgHex('#5865F2').hex('#FFFFFF')(` ${item} `);
				}
				return chalk.hex('#DCDDDE')(` ${item}`);
			});
			layout.mentionBox.setContent(rendered.join('\n'));
			layout.mentionBox.show();
		},

		hideMentionSuggestions(): void {
			layout.mentionBox.hide();
			layout.mentionBox.setContent('');
		},

		isMentionSuggestionsVisible(): boolean {
			return !layout.mentionBox.hidden;
		},

		showAttachmentModal(title: string, lines: string[]): void {
			layout.attachmentModal.setLabel(` ${title} `);
			layout.attachmentModal.setContent(lines.join('\n'));
			layout.attachmentModal.setScroll(0);
			layout.attachmentModal.show();
			interactions.focusAttachment();
		},

		hideAttachmentModal(): void {
			layout.attachmentModal.hide();
			layout.attachmentModal.setContent('');
			interactions.restoreFocusAfterAttachment();
		},

		isAttachmentModalVisible(): boolean {
			return !layout.attachmentModal.hidden;
		},

		showExitConfirmation(): void {
			layout.exitConfirmModal.show();
			interactions.focusExitConfirmation();
		},

		hideExitConfirmation(): void {
			layout.exitConfirmModal.hide();
			interactions.restoreFocusAfterExitConfirmation();
		},

		scrollAttachmentModal(delta: number): void {
			layout.attachmentModal.scroll(delta);
		},

		getAttachmentModalHeight(): number {
			return layout.attachmentModal.height as number;
		},

		setSidebarItems(items: string[]): void {
			layout.sidebar.setItems(items);
		},

		selectSidebar(index: number): void {
			layout.sidebar.select(index);
		},

		getSidebarSelectedIndex(): number {
			return (layout.sidebar as blessed.Widgets.ListElement & { selected: number }).selected;
		},

		scrollChat(delta: number): void {
			layout.chatBox.scroll(delta);
		},

		getChatHeight(): number {
			return layout.chatBox.height as number;
		},

		setTitleBar(serverName, channelName, status): void {
			layout.titleBar.setContent(renderTitleBarContent(serverName, channelName, status));
		},

		setStatusBar(content: string): void {
			layout.statusBar.setContent(content);
		},

		onGlobalKey(keys: string[], handler: KeyHandler): void {
			screen.key(keys, safeAsync(handler));
		},

		onSidebarKey(keys: string[], handler: KeyHandler): void {
			interactions.onSidebarKey(keys, handler);
		},

		onInputKey(keys: string[], handler: KeyHandler): void {
			interactions.onInputKey(keys, handler);
		},

		onAttachmentKey(keys: string[], handler: KeyHandler): void {
			interactions.onAttachmentKey(keys, handler);
		},

		onExitConfirmationKey(keys: string[], handler: KeyHandler): void {
			interactions.onExitConfirmationKey(keys, handler);
		},

		onInputSubmit(handler: (value: string) => void | Promise<void>): void {
			layout.inputBox.on('submit', (value) => {
				void Promise.resolve(handler(value));
			});
		},

		onInputKeypress(handler: (ch: string) => void): void {
			layout.inputBox.on('keypress', (ch) => {
				handler(ch ?? '');
			});
		}
	};
}