import { marked } from 'marked';
import { markedTerminal } from 'marked-terminal';
import chalk from 'chalk';

marked.use(markedTerminal({
	code: chalk.bgHex('#2F3136').hex('#E8912D'),
	codespan: chalk.bgHex('#2F3136').hex('#E8912D'),
	blockquote: chalk.hex('#B9BBBE').italic,
	strong: chalk.bold,
	em: chalk.italic,
	del: chalk.strikethrough,
	link: chalk.hex('#00AFF4').underline,
	href: chalk.hex('#00AFF4'),
	heading: chalk.hex('#FFFFFF').bold,
	paragraph: (text: string) => text,
	listitem: (text: string) => `  • ${text}`,
	tab: 2,
	showSectionPrefix: false,
	reflowText: false,
	width: 80,
}) as any);

function preprocess(text: string): string {
	let result = text;

	result = result.replace(/\|\|(.+?)\|\|/g, (_m, t) =>
		chalk.bgHex('#202225').hex('#202225')(t) + chalk.dim(' [spoiler]')
	);

	result = result.replace(/__([^_]+?)__/g, (_m, t) => chalk.underline(t));

	return result;
}

export function renderDiscordMarkdown(text: string): string {
	const preprocessed = preprocess(text);
	const rendered = marked.parse(preprocessed) as string;
	return rendered.replace(/\n+$/, '');
}
