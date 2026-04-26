import terminalImage from 'terminal-image';
import got from 'got';
import stringWidth from 'string-width';

const ANSI_ESCAPE_PATTERN = /\u001B\[[0-?]*[ -/]*[@-~]/g;

function stripAnsiCodes(text: string): string {
	return text.replace(ANSI_ESCAPE_PATTERN, '');
}

function isImagePreviewSupported(): boolean {
	const terminalProgram = process.env.TERM_PROGRAM?.toLowerCase() ?? '';
	const isCodespaces = process.env.CODESPACES === 'true';

	if (isCodespaces || terminalProgram.includes('vscode')) {
		return false;
	}

	const terminalImageWithSupport = terminalImage as unknown as { isSupported?: boolean };
	return terminalImageWithSupport.isSupported !== false;
}

function frameImagePreview(preview: string): string {
	const lines = preview.replace(/\r/g, '').split('\n');
	const widths = lines.map((line) => stringWidth(stripAnsiCodes(line)));
	const maxWidth = Math.max(...widths, 0);
	const horizontal = '─'.repeat(maxWidth + 2);
	const framedLines = lines.map((line) => {
		const visibleWidth = stringWidth(stripAnsiCodes(line));
		const padding = ' '.repeat(Math.max(0, maxWidth - visibleWidth));
		return `│ ${line}${padding} │`;
	});

	return [`┌${horizontal}┐`, ...framedLines, `└${horizontal}┘`].join('\n');
}

export async function displayImage(url: string): Promise<string | null> {
	if (!isImagePreviewSupported()) {
		return null;
	}

	try{
		const body = await got(url).buffer();
		const image = await terminalImage.buffer(body, {
			width: 40,
			height: 40,
			preserveAspectRatio: true
		});

		return frameImagePreview(image);
	}

	catch(error){
		return null;
	}
}