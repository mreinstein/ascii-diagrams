const _grid = {
	columns: 160,
	rows: 54,
	data: [ ]
}

const chars = [ '▼', '▲', '◀', '▶', '┤', '├', '┴', '┬', ' ', '|', '-', ' ', '┘', '└', '┌', '┐', ' ', ' ', ' ', ' ' ]

for (let i=0; i < _grid.columns * _grid.rows; i++) {
	const val = chars[Math.floor(Math.random() * chars.length)]
	_grid.data.push(val)
}


// TODO: investigate snabby for rendering
function createGrid (grid) {
	let result = ''

	const bgColor = 'white'
	const fgColor = 'black'

	for (let row = 0; row < grid.rows; row++) {
		for (let col=0; col < grid.columns; col++) {
			const cell = (row * grid.columns) + col
			result += `<div style="color: ${fgColor}; background-color: ${bgColor}; width: 9px;">${grid.data[cell]}</div>`
		}
		result += '<br>'
	}

	const gridEl = document.getElementById('grid')
	gridEl.innerHTML = result
}


createGrid(_grid)
