export type KeyHandler = () => void | Promise<void>;

export interface UIBridge {
	render(): void;
	showChatUI(): void;
	hideChatUI(): void;

	clearChat(): void;
	hardRefresh(): void;
	appendChat(line: string): void;
	setChatContent(content: string): void;
	setChatLabel(label: string): void;

	clearInput(): void;
	getInputValue(): string;
	setInputValue(value: string): void;
	focusInput(): void;
	focusSidebar(): void;
	setInputLabel(label: string): void;
	setInputBorderColor(color: string): void;
	showMentionSuggestions(items: string[], selectedIndex: number): void;
	hideMentionSuggestions(): void;
	isMentionSuggestionsVisible(): boolean;

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