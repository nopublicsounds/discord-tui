import blessed from 'blessed';

export function createSidebar(screen: blessed.Widgets.Screen){
	const sidebar = blessed.list({
		parent: screen,
		name: 'sidebar',
		top: 1,
		left: 0,
		width: '25%',
		height: '100%-4',
		border: {
			type: 'line'
		},
		scrollbar: {
			ch: '▊',
			style: { fg: '#5865F2', bg: '#2F3136' }
		},
		style: {
			bg: '#2F3136',
			border: {
				fg: '#202225'
			},
			selected: {
				fg: '#FFFFFF',
				bg: '#393C43',
				bold: true
			},
			item: {
				fg: '#8E9297',
				bg: '#2F3136'
			}
		},
		label: {
			text: ' ☰ Channels ',
			side: 'left'
		} as any,
		keys: false,
		vi: true,
		mouse: true,
		tags: false,
		interactive: true,
		invertSelected: false
	});
	
	return sidebar;
}