import Display          from '/node_modules/rot-js/lib/display/display.js'
import { createMachine,
         interpret }    from '/node_modules/@xstate/fsm/es/index.js'


/*
TODO:
    * remove line
    * remove box
    * starting a line not connected to a box throws an error
    * box label
    * line label
    * explore dom based renderer
*/


function findBox (col, row, boxes) {
    return boxes.find((b) => col >= b.minCol && col <= b.maxCol && row >= b.minRow && row <= b.maxRow)
}


// given a box and a point on the box, determine the
// point on the edge of the box closest to the provided point
//
// @param Object box { minCol, minRow, maxCol, maxRow }
function findClosestPointOnBox (col, row, box) {
    // determine the box side that is closest
    let delta = Math.abs(col - box.minCol)
    let side = 'left'

    if (Math.abs(col - box.maxCol) < delta) {
        delta = Math.abs(col - box.maxCol)
        side = 'right'
    }

    if (Math.abs(row - box.maxRow) < delta) {
        delta = Math.abs(row - box.maxRow)
        side = 'bottom'
    }

    if (Math.abs(row - box.minRow) < delta) {
        delta = Math.abs(row - box.minRow)
        side = 'top'
    }

    if (side === 'left')
        return { col: box.minCol, row, side }

    if (side === 'right')
        return { col: box.maxCol, row, side }

    if (side === 'bottom')
        return { col, row: box.maxRow, side }

    return { col, row: box.minRow, side }
}


function getArrowDirection (path) {
    const [ col, row ] = path[path.length-2]
    const [ col2, row2 ] = path[path.length-1]

    const dx = col2 - col
    const dy = row2 - row

    if (dx > 0)
        return 'right'

    if (dx < 0)
        return 'left'

    if (dy > 0)
        return 'bottom'

    return 'top'
}


// given a start position and end position, generate a path of points
// @param string side which side of the box the line emits from
function pathLine (side, start, end) {
    const { col, row } = start
    const col2 = end.col
    const row2 = end.row

    const path = [ [ col, row ] ]

    const dx = col2 - col
    const dy = row2 - row

    if (dx !== 0 && dy !== 0) {
        // determine where the elbow joint should go
        if (side === 'top' || side === 'bottom')
            path.push([ col, row2 ])
        else
            path.push([ col2, row ])
    }

    path.push([ col2, row2 ])

    return path
}


const model = {
	rows: 100,
	cols: 35
}

// defaults to 80x25
const display = new Display({
	bg: '#fff',
	width: model.rows,
	height: model.cols,
	fontSize: 12,
    fontFamily: 'SFMono-Regular,Consolas,Liberation Mono,Menlo,monospace',
	spacing: 1
})

const container = display.getContainer()

document.body.appendChild(container)

const [ moveToggle, lineToggle ] = document.querySelectorAll('button')


lineToggle.onclick = function () {
    asciiService.send('TOGGLE_LINEDRAW')
}


moveToggle.onclick = function () {
    asciiService.send('TOGGLE_MOVE')
}


const asciiMachine = createMachine({
	initial: 'uninitialized',

    // object containing all shared state for this machine
    context: {
        activeBox: undefined,
        activeLine: undefined,

        downPos: undefined,

        moving: undefined,

        boxes: [ ],
        lines: [ ],
	    currentPos: undefined,
		downPos: undefined
    },

    states: {
    	uninitialized: {
    		on: {
    			INIT: 'normal'
    		}
    	},
        normal: {
            entry: function (context/*, event */) {
            	container.onmousedown = function (ev) {
            		context.downPos = display.eventToPosition(ev)
            		asciiService.send('DRAW_BOX')
				}
            },
            exit: function (context/*, event */) {
             	container.onmousedown = undefined
            },
            on: {
            	TOGGLE_LINEDRAW: 'drawing_line',
                TOGGLE_MOVE: 'moving_box',
            	DRAW_BOX: 'drawing_box'
            }
        },
        drawing_line: {
        	entry: function (context) {
                lineToggle.style.color = 'dodgerblue'

        		container.onmousedown = function (ev) {
                    const [ col, row ] = display.eventToPosition(ev)
                    const box = findBox(col, row, context.boxes)
                    if (!box)
                        return

                    const point = findClosestPointOnBox(col, row, box)
                    // TODO: store position of line start relative to the
                    //       top left corner of the box it originates from
                    // TODO: render the line using the relative line start

        			context.activeLine = {
                        start: {
                            box, point
                        },
                        end: {
                            box, point
                        }
        			}

        			container.onmousemove = function (ev) {
                        const [ col, row ] = display.eventToPosition(ev)
                        const box = findBox(col, row, context.boxes)

                        const point = box ? findClosestPointOnBox(col, row, box) : { col, row }

                        context.activeLine.end.box = box
	        			context.activeLine.end.point = point
						draw(context)
	        		}
        		}

        		container.onmouseup = function (ev) {
                    //console.log('new line created:', context.activeLine)
                    const path = pathLine(context.activeLine.start.point.side, context.activeLine.start.point, context.activeLine.end.point)
                    //console.log('path:', path)

        			context.lines.push({ ...context.activeLine })
        			context.activeLine = undefined
        			container.onmousemove = undefined
                    //container.onmouseup = undefined
                    //container.onmousedown = undefined
        			draw(context)
        		}

        	},
        	exit: function (context) {
                lineToggle.style.color = 'white'
        		context.activeLine = undefined
        		container.onmousemove = undefined
        		//container.onmousedown = undefined
        		//container.onmouseup = undefined
        	},
        	on: {
        		TOGGLE_LINEDRAW: 'normal',
                TOGGLE_MOVE: 'moving_box',
        	}
        },
        moving_box: {
            entry: function (context) {
                moveToggle.style.color = 'dodgerblue'

                container.onmousedown = function (ev) {
                    const [ col, row ] = display.eventToPosition(ev)
                    const box = findBox(col, row, context.boxes)
                    if (box)
                        context.moving = {
                            box,
                            point: [ box.minCol - col, box.minRow - row ]
                        }
                }

                container.onmousemove = function (ev) {
                    if (!context.moving)
                        return

                    const [ col, row ] = display.eventToPosition(ev)

                    const dx = col - context.moving.box.minCol + context.moving.point[0]
                    const dy = row - context.moving.box.minRow + context.moving.point[1]

                    context.moving.box.minCol += dx
                    context.moving.box.minRow += dy

                    context.moving.box.maxCol += dx
                    context.moving.box.maxRow += dy

                    draw(context)
                }

                container.onmouseup = function (ev) {
                    context.moving = undefined
                }

            },
            exit: function (context) {
                moveToggle.style.color = 'white'
            },
            on: {
                TOGGLE_LINEDRAW: 'drawing_line',
                TOGGLE_MOVE: 'normal',
            }
        },
        drawing_box: {
        	entry: function (context) {
        		context.activeBox = {
        			currentPos: context.downPos,
        			downPos: context.downPos
        		}

        		container.onmousemove = function (ev) {
        			context.activeBox.currentPos = display.eventToPosition(ev)
					draw(context)
        		}

        		container.onmouseup = function (ev) {

					const currentPos = display.eventToPosition(ev)

					const [ col, row ] = currentPos

					const minCol = Math.min(col, context.activeBox.downPos[0])
					const maxCol = Math.max(col, context.activeBox.downPos[0])

					const minRow = Math.min(row, context.activeBox.downPos[1])
					const maxRow = Math.max(row, context.activeBox.downPos[1])

					if (maxCol - minCol >=1 && maxRow - minRow >= 1)
						context.boxes.push({  minCol, minRow, maxCol, maxRow })

					asciiService.send('END_DRAW')
					draw(context)
				}
        	},
        	exit: function (context) {
        		container.onmousemove = undefined
        		container.onmouseup = undefined
        		context.activeBox = undefined
        	},
        	on: {
        		END_DRAW: 'normal'
        	}
        }
    }
})


const asciiService = interpret(asciiMachine).start()
asciiService.send('INIT')


function drawBox ({ minCol, minRow, maxCol, maxRow, fill }) {
	const boxPieces = [ '└', '┘', '┐', '┌', '-', '|' ]

	const borderColor = '#333'

	display.draw(minCol, minRow, boxPieces[3], borderColor)
	display.draw(maxCol, maxRow, boxPieces[1], borderColor)
	display.draw(maxCol, minRow, boxPieces[2], borderColor)
	display.draw(minCol, maxRow, boxPieces[0], borderColor)

	for (let c=minCol+1; c < maxCol; c++) {
		display.draw(c, maxRow, boxPieces[4], borderColor)
		display.draw(c, minRow, boxPieces[4], borderColor)
	}

	for (let r=minRow+1; r < maxRow; r++) {
		display.draw(minCol, r, boxPieces[5], borderColor)
		display.draw(maxCol, r, boxPieces[5], borderColor)
	}

	if (fill)
		for (let r=minRow+1; r < maxRow; r++)
			for (let c=minCol+1; c < maxCol; c++)
				display.draw(c, r, '▉', 'white')
}


function drawPath (start, end) {
    const path = pathLine(start.point.side, start.point, end.point)

    // convert each line in the path into a set of cells
    const cells = [ ]

    for (let i=0; i < path.length-1; i++) {
        const start = path[i]
        const end = path[i+1]

        const dx = end[0] - start[0]
        const dy = end[1] - start[1]
        let direction


        if (dx !== 0)
            direction = (dx > 0) ? 'right' : 'left'

        if (dy !== 0)
            direction = (dy > 0) ? 'down' : 'up'

        if (direction === 'right')
            for (let c=start[0]; c < end[0]; c++)
                cells.push({ col: c, row: start[1], direction })

        if (direction === 'left') {
            //console.log('moop', end[0], start[0])
            for (let c=start[0]; c >= end[0]; c--)
                cells.push({ col: c, row: start[1], direction })
        }

        if (direction === 'down')
            for (let r=start[1]; r < end[1]; r++)
                cells.push({ col: end[0], row: r, direction })

        if (direction === 'up')
            for (let r=start[1]; r >= end[1]; r--)
                cells.push({ col: end[0], row: r, direction })
    }


    if (!cells.length)
        return

    let lastDirection = cells[0].direction

    cells.forEach(function (cell, idx) {
        let char = ''

        if (idx === 0) {
            if (cell.direction === 'left')
                char = '┤'
            if (cell.direction === 'right')
                char = '├'
            if (cell.direction === 'up')
                char = '┴'
            if (cell.direction === 'down')
                char = '┬'
        } else if (idx === cells.length - 1) {
            if (cell.direction === 'left')
                char = '◀'
            if (cell.direction === 'right')
                char = '▶'
            if (cell.direction === 'up')
                char = '▲'
            if (cell.direction === 'down')
                char = '▼'

        } else if (lastDirection !== cell.direction) {
            if (lastDirection === 'right' && cell.direction === 'up')
                char = '┘'
            if (lastDirection === 'down' && cell.direction === 'left')
                char = '┘'

            if (lastDirection === 'left' && cell.direction === 'up')
                char = '└'
            if (lastDirection === 'down' && cell.direction === 'right')
                char = '└'

            if (lastDirection === 'left' && cell.direction === 'down')
                char = '┌'
            if (lastDirection === 'up' && cell.direction === 'right')
                char = '┌'

            if (lastDirection === 'right' && cell.direction === 'down')
                char = '┐'
            if (lastDirection === 'up' && cell.direction === 'left')
                char = '┐'
        } else {
            if (cell.direction === 'left' || cell.direction === 'right')
                char = '-'
            if (cell.direction === 'up' || cell.direction === 'down')
                char = '|'
        }

        lastDirection = cell.direction
        display.draw(cell.col, cell.row, char, 'dodgerblue')
    })
}


function clear () {
	for (let r=0; r < model.rows; r++)
		for (let c=0; c < model.cols; c++)
			display.draw(r, c, '.', 'whitesmoke')
}


function draw (context) {
	clear()

	for (const box of context.boxes)
		drawBox({ ...box, fill: true })

	if (context.activeBox) {
		const [ col, row ] = context.activeBox.currentPos

		const minCol = Math.min(col, context.activeBox.downPos[0])
		const maxCol = Math.max(col, context.activeBox.downPos[0])

		const minRow = Math.min(row, context.activeBox.downPos[1])
		const maxRow = Math.max(row, context.activeBox.downPos[1])

		drawBox({ minCol, minRow, maxCol, maxRow, fill: true })
	}

    for (const line of context.lines)
        drawPath(line.start, line.end)

	if (context.activeLine)
		drawPath(context.activeLine.start, context.activeLine.end)
}


function animate () {
	draw(asciiMachine.initialState.context)
	requestAnimationFrame(animate)
}

animate()

/*
window.addEventListener('resize', function () {
    // TODO: resize the grid based on screen dimensions
})

//display.drawText(5, 5, 'Here goes something!')
*/
