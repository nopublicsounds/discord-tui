import type blessed from 'blessed';

import { createAppLayout, hideChatUI, renderTitleBarContent, showChatUI } from './layout.js';
import type { KeyHandler, UIBridge } from './types.js';

export function createBlessedUIBridge(screen: blessed.Widgets.Screen): UIBridge {
	const layout = createAppLayout(screen);

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

		focusInput(): void {
			layout.inputBox.focus();
		},

		focusSidebar(): void {
			layout.sidebar.focus();
		},

		setInputLabel(label: string): void {
			layout.inputBox.setLabel(` ✦ ${label} `);
		},

		setInputBorderColor(color: string): void {
			layout.inputBox.style.border.fg = color;
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
			layout.sidebar.key(keys, safeAsync(handler));
		},

		onInputKey(keys: string[], handler: KeyHandler): void {
			layout.inputBox.key(keys, safeAsync(handler));
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