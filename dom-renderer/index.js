export default function Display ({ bg, width, height }) {
	const _grid = {
		columns: 40,
		rows: 24,
		bg: [ ],
		fg: [ ],
		data: [ ]
	}

	const changed = [ ]
	const cellEls = [ ]

	const gridEl = document.createElement('div')
	gridEl.classList.add('unicodetiles')


	const createGrid = function (grid) {
		let result = ''

		const fgColor = 'black'

		for (let row = 0; row < grid.rows; row++) {
			for (let col=0; col < grid.columns; col++) {
				const cell = (row * grid.columns) + col
				_grid.data[cell] = ' '
				_grid.fg[cell] = fgColor
				_grid.bg[cell] = bg
				const nextEl = document.createElement('div')
				nextEl.style.color = fgColor
				nextEl.style.backgroundColor = bg
				nextEl.style.width = '9px'
				nextEl.innerText = grid.data[cell]
				gridEl.appendChild(nextEl)
				cellEls.push(nextEl)

			}
			gridEl.appendChild(document.createElement('br'))
		}
	}

	createGrid(_grid)


	const draw = function (col, row, glyph, fg, bgColor=bg) {
		const idx = Math.floor(row * _grid.columns + col)

		if (_grid.fg[idx] === fg && _grid.bg[idx] === bgColor && _grid.data[idx] === glyph)
			return

		_grid.fg[idx] = fg
		_grid.bg[idx] = bgColor
		_grid.data[idx] = glyph
		changed.push(idx)
	}


	const drawText = function (col, row, str, fg, bgColor=bg) {
		// TODO
	}


	const eventToPosition = function (e) {
		let x, y

		if ('touches' in e) {
			x = e.touches[0].clientX
			y = e.touches[0].clientY
		} else {
			x = e.clientX
			y = e.clientY
		}

		return [ x / 9 | 0, y / 16 | 0]
	}


	return {
		draw,
		drawText,
		getContainer: () => gridEl,
		eventToPosition,
		render: function () {
			for (let i=0; i < changed.length; i++) {
				const idx = changed[i]
				cellEls[idx].style.backgroundColor = _grid.bg[idx]
				cellEls[idx].style.color = _grid.fg[idx]
				cellEls[idx].innerText = _grid.data[idx]
			}

			changed.length = 0
		}
	}
}
