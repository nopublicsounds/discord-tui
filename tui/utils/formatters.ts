import chalk from 'chalk';

export function formatTime(timestamp: number): string{
	return new Date(timestamp).toLocaleTimeString(undefined, {
		hour: '2-digit',
		minute: '2-digit',
		second: '2-digit',
		hour12: false
	});
}

export function formatDate(timestamp: number): string {
	return new Date(timestamp).toLocaleDateString(undefined, {
		year: 'numeric',
		month: 'long',
		day: 'numeric',
		weekday: 'long'
	});
}

export function renderDateSeparator(timestamp: number, width: number = 60): string {
	const dateStr = formatDate(timestamp);
	const label = ` ${dateStr} `;
	const sideLen = Math.max(0, Math.floor((width - label.length) / 2));
	const line = '─'.repeat(sideLen);
	return chalk.hex('#4F545C')(`${line}${label}${line}`);
}
