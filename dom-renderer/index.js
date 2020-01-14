import html from 'snabby'


const _grid = {
	columns: 100,
	rows: 54,
	data: [ ]
}

const chars = [ '▼', '▲', '◀', '▶', '┤', '├', '┴', '┬', ' ', '|', '-', ' ', '┘', '└', '┌', '┐', ' ', ' ', ' ', ' ' ]

for (let i=0; i < _grid.columns * _grid.rows; i++) {
	const val = chars[Math.floor(Math.random() * chars.length)]
	_grid.data.push(val)
}


let vNode = document.getElementById('grid')


function render (grid) {
	const result = [ ]

	const bgColor = 'white'
	const fgColor = 'black'

	for (let row = 0; row < grid.rows; row++) {
		for (let col=0; col < grid.columns; col++) {
			const cell = (row * grid.columns) + col
			result.push(html`<div style="color: ${fgColor}; background-color: ${bgColor}; width: 9px;">${grid.data[cell]}</div>`)
		}
		result.push(html`<br>`)
	}

	vNode = html.update(vNode, html`<div id="grid" class="unicodetiles">${result}</div>`)
}


render(_grid)
