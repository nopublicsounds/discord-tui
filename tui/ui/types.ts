export type KeyHandler = () => void | Promise<void>;

export interface UIBridge {
	render(): void;
	showChatUI(): void;
	hideChatUI(): void;

	clearChat(): void;
	appendChat(line: string): void;
	setChatContent(content: string): void;
	setChatLabel(label: string): void;

	clearInput(): void;
	getInputValue(): string;
	focusInput(): void;
	focusSidebar(): void;
	setInputLabel(label: string): void;
	setInputBorderColor(color: string): void;

	setSidebarItems(items: string[]): void;
	selectSidebar(index: number): void;
	getSidebarSelectedIndex(): number;

	scrollChat(delta: number): void;
	getChatHeight(): number;

	setTitleBar(serverName: string | null, channelName: string | null, status: 'connecting' | 'connected' | 'disconnected'): void;
	setStatusBar(content: string): void;

	onGlobalKey(keys: string[], handler: KeyHandler): void;
	onSidebarKey(keys: string[], handler: KeyHandler): void;
	onInputKey(keys: string[], handler: KeyHandler): void;
	onInputSubmit(handler: (value: string) => void | Promise<void>): void;
	onInputKeypress(handler: (ch: string) => void): void;
}