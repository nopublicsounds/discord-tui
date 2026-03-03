import blessed from 'blessed';

export function createSidebar(screen: blessed.Widgets.Screen){
	const sidebar = blessed.list({
		parent: screen,
		name: 'sidebar',
		width: '30%',
		height: '100%',
		border: {
			type: 'line'
		},
		style: {
			border: {
				fg: 'blue'
			},
			selected: {
				fg: 'blue',
				bold: true
			},
			item: {
				fg: 'white'
			}
		},
		label: 'Servers & Channels',

		keys: false,
		vi: true,
		mouse: true,
		tags: true,
		interactive: true,
		invertSelected: false
	});
	
	return sidebar;
}