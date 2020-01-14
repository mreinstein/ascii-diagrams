const _grid = {
	columns: 100,
	rows: 54,
	data: [ ]
}


const changed = [ ]
const cellEls = [ ]

const chars = [ '▼', '▲', '◀', '▶', '┤', '├', '┴', '┬', ' ', '|', '-', ' ', '┘', '└', '┌', '┐', ' ', ' ', ' ', ' ' ]

for (let i=0; i < _grid.columns * _grid.rows; i++) {
	const val = chars[Math.floor(Math.random() * chars.length)]
	_grid.data.push(val)
	changed.push(i)
}


function render (grid) {
	for (let i=0; i < changed.length; i++) {
		const idx = changed[i]
		//const col = idx % grid.columns
		//const row = idx / grid.columns | 0
		cellEls[idx].innerText = grid.data[idx]
	}

	changed.length = 0
}


function createGrid (grid) {

	const gridEl = document.getElementById('grid')
	let result = ''

	const bgColor = 'white'
	const fgColor = 'black'

	for (let row = 0; row < grid.rows; row++) {
		for (let col=0; col < grid.columns; col++) {
			const cell = (row * grid.columns) + col
			const nextEl = document.createElement('div')
			nextEl.style.color = fgColor
			nextEl.style.backgroundColor = bgColor
			nextEl.style.width = '9px'
			nextEl.innerText = grid.data[cell]
			gridEl.appendChild(nextEl)
			cellEls.push(nextEl)
		}
		gridEl.appendChild(document.createElement('br'))
		//result += `<br>`
	}

	//gridEl.innerHTML = result
}


/*
setInterval(function () {
	for (let i=0; i < 100; i++) {
		const idx = Math.floor(Math.random() * _grid.columns * _grid.rows)
		_grid.data[idx] = chars[Math.floor(Math.random() * chars.length)]
		changed.push(idx)
	}
	render(_grid)
}, 100)
*/

createGrid(_grid)
