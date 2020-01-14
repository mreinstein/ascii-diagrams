(function () {
	'use strict';

	const _grid = {
		columns: 100,
		rows: 54,
		data: [ ]
	};

	const chars = [ '▼', '▲', '◀', '▶', '┤', '├', '┴', '┬', ' ', '|', '-', ' ', '┘', '└', '┌', '┐', ' ', ' ', ' ', ' ' ];

	for (let i=0; i < _grid.columns * _grid.rows; i++) {
		const val = chars[Math.floor(Math.random() * chars.length)];
		_grid.data.push(val);
	}


	function createGrid (grid) {

		const gridEl = document.getElementById('grid');

		const bgColor = 'white';
		const fgColor = 'black';

		for (let row = 0; row < grid.rows; row++) {
			for (let col=0; col < grid.columns; col++) {
				const cell = (row * grid.columns) + col;
				const nextEl = document.createElement('div');
				nextEl.style.color = fgColor;
				nextEl.style.backgroundColor = bgColor;
				nextEl.style.width = '9px';
				nextEl.innerText = grid.data[cell];
				gridEl.appendChild(nextEl);
				//result += `<div style="color: ${fgColor}; background-color: ${bgColor}; width: 9px;">${grid.data[cell]}</div>`
			}
			gridEl.appendChild(document.createElement('br'));
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

	createGrid(_grid);

}());
