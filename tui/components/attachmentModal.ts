import blessed from 'blessed';

export function createAttachmentModal(screen: blessed.Widgets.Screen) {
	const attachmentModal = blessed.box({
		parent: screen,
		top: 'center',
		left: 'center',
		width: '70%',
		height: '65%',
		border: {
			type: 'line'
		},
		style: {
			bg: '#202225',
			fg: '#DCDDDE',
			border: {
				fg: '#5865F2'
			}
		},
		label: {
			text: ' Attachments ',
			side: 'left'
		} as any,
		tags: false,
		padding: {
			left: 1,
			right: 1,
			top: 0,
			bottom: 0,
		},
		scrollable: true,
		alwaysScroll: true,
		keys: true,
		mouse: true,
		vi: true,
		content: '',
	});

	attachmentModal.hide();
	return attachmentModal;
}
