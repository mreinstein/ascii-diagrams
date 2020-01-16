//import Display          from '/node_modules/rot-js/lib/display/display.js'
//import Display          from './dom-renderer/index.js'
import CharCode         from './raster-font/char_code.js'
import Display          from './raster-font/index.js'
import { createMachine,
         interpret }    from '/node_modules/@xstate/fsm/es/index.js'


//Display.Rect.cache = true


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
	cols: 100,
	rows: 50
}

// defaults to 80x25
const display = Display({
	bg: '#fff',
	rows: model.rows,
	columns: model.cols,
	fontSize: 12,
    fontFamily: 'SFMono-Regular,Consolas,Liberation Mono,Menlo,monospace',
	spacing: 1
})
//display.render()

const container = display.getContainer()
document.body.appendChild(container)


const [ labelToggle, moveToggle, lineToggle, boxToggle ] = document.querySelectorAll('button')


lineToggle.onclick = function () {
    asciiService.send('TOGGLE_LINEDRAW')
}

moveToggle.onclick = function () {
    asciiService.send('TOGGLE_MOVE')
}

boxToggle.onclick = function () {
    asciiService.send('TOGGLE_BOXDRAW')
}

labelToggle.onclick = function () {
    asciiService.send('TOGGLE_LABEL')
}

const asciiMachine = createMachine({
	initial: 'uninitialized',

    // object containing all shared state for this machine
    context: {
        activeBox: undefined,
        activeLine: undefined,

        movingBox: undefined,

        labelingBox: undefined,

        boxes: [ ],
        lines: [ ],
	    currentPos: undefined
    },

    states: {
    	uninitialized: {
    		on: {
    			INIT: 'drawing_box'
    		}
    	},
        normal: {
            on: {
                TOGGLE_BOXDRAW: 'drawing_box',
                TOGGLE_LABEL: 'labeling',
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

        			context.activeLine = {
                        start: {
                            box,
                            point: {
                                col: point.col - box.minCol,
                                row: point.row - box.minRow,
                                side: point.side
                            }
                        },
                        end: {
                            box,
                            point: {
                                // store position of line point relative to the
                                //  top left corner of the box it connects with
                                col: point.col - box.minCol,
                                row: point.row - box.minRow,
                                side: point.side
                            }
                        }
        			}

        			container.onmousemove = function (ev) {
                        const [ col, row ] = display.eventToPosition(ev)
                        const box = findBox(col, row, context.boxes)

                        if (box) {
                            const point = findClosestPointOnBox(col, row, box)
                            context.activeLine.end.point = {
                                col: point.col - box.minCol,
                                row: point.row - box.minRow,
                                side: point.side
                            }
                        } else {
                           context.activeLine.end.point = { col, row }
                        }

                        context.activeLine.end.box = box

						draw(context)
	        		}
        		}

        		container.onmouseup = function (ev) {
                    if (context.activeLine)
        			     context.lines.push({ ...context.activeLine })
        			context.activeLine = undefined
        			container.onmousemove = undefined
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
                TOGGLE_BOXDRAW: 'drawing_box',
                TOGGLE_LABEL: 'labeling',
        		TOGGLE_LINEDRAW: 'normal',
                TOGGLE_MOVE: 'moving_box'
        	}
        },
        labeling: {
            entry: function (context) {
                labelToggle.style.color = 'dodgerblue'


                const textarea = document.querySelector('textarea')

                container.onmousedown = function (ev) {
                    const [ col, row ] = display.eventToPosition(ev)
                    const box = findBox(col, row, context.boxes)

                    textarea.style.display = box ? '' : 'none'
                    if (!box) {
                        if (context.labelingBox)
                            context.labelingBox.box.labels.push(context.labelingBox)  
                        context.labelingBox = undefined
                        textarea.value = ''
                        return
                    }

                    console.log('about to set focus on textarea')
                    setTimeout(function () {
                       textarea.focus() 
                    })
                    
                    const relativeCol = col - box.minCol
                    const relativeRow = row - box.minRow

                    context.labelingBox = {
                        box,
                        point: [ relativeCol, relativeRow ],
                        text: ''
                    }
                }

                textarea.onkeyup = function () {
                    if (!context.labelingBox)
                        return
                    context.labelingBox.text = textarea.value
                    draw(context)
                }

               
            },
            exit: function (context) {
                if (context.labelingBox)
                    context.labelingBox.box.labels.push(context.labelingBox)

                const textarea = document.querySelector('textarea')
                textarea.value = ''
                textarea.onkeyup = undefined
                textarea.style.display = 'none'
                container.onmousedown = undefined
                context.labelingBox = undefined
                labelToggle.style.color = 'white'
            },
            on: {
                TOGGLE_BOXDRAW: 'drawing_box',
                TOGGLE_LABEL: 'normal',
                TOGGLE_LINEDRAW: 'drawing_line',
                TOGGLE_MOVE: 'moving_box',
                DRAW_BOX: 'drawing_box'
            }
        },
        moving_box: {
            entry: function (context) {
                moveToggle.style.color = 'dodgerblue'

                container.onmousedown = function (ev) {
                    const [ col, row ] = display.eventToPosition(ev)
                    const box = findBox(col, row, context.boxes)
                    if (box)
                        context.movingBox = {
                            box,
                            point: [ box.minCol - col, box.minRow - row ]
                        }
                }

                container.onmousemove = function (ev) {
                    if (!context.movingBox)
                        return

                    const [ col, row ] = display.eventToPosition(ev)

                    const dx = col - context.movingBox.box.minCol + context.movingBox.point[0]
                    const dy = row - context.movingBox.box.minRow + context.movingBox.point[1]

                    context.movingBox.box.minCol += dx
                    context.movingBox.box.minRow += dy

                    context.movingBox.box.maxCol += dx
                    context.movingBox.box.maxRow += dy

                    draw(context)
                }

                container.onmouseup = function (ev) {
                    context.movingBox = undefined
                }

            },
            exit: function (context) {
                container.onmouseup = container.onmousedown = container.onmousemove = undefined
                moveToggle.style.color = 'white'
            },
            on: {
                TOGGLE_BOXDRAW: 'drawing_box',
                TOGGLE_LABEL: 'labeling',
                TOGGLE_LINEDRAW: 'drawing_line',
                TOGGLE_MOVE: 'normal',
            }
        },
        drawing_box: {
        	entry: function (context) {
                boxToggle.style.color = 'dodgerblue'

                container.onmousedown = function (ev) {
                    context.activeBox = {
                        currentPos: display.eventToPosition(ev),
                        downPos: display.eventToPosition(ev)
                    }

                    asciiService.send('DRAW_BOX')
                }

        		container.onmousemove = function (ev) {
                    if (!context.activeBox)
                        return

        			context.activeBox.currentPos = display.eventToPosition(ev)
					draw(context)
        		}

        		container.onmouseup = function (ev) {
                    if (!context.activeBox)
                        return

					const currentPos = display.eventToPosition(ev)

					const [ col, row ] = currentPos

					const minCol = Math.min(col, context.activeBox.downPos[0])
					const maxCol = Math.max(col, context.activeBox.downPos[0])

					const minRow = Math.min(row, context.activeBox.downPos[1])
					const maxRow = Math.max(row, context.activeBox.downPos[1])

					if (maxCol - minCol >=1 && maxRow - minRow >= 1)
						context.boxes.push({  minCol, minRow, maxCol, maxRow, labels: [ ] })

                    context.activeBox = undefined

					draw(context)
				}
        	},
        	exit: function (context) {
                boxToggle.style.color = 'white'
                container.onmousedown = undefined
        		container.onmousemove = undefined
        		container.onmouseup = undefined
        		context.activeBox = undefined
        	},
        	on: {
        		TOGGLE_BOXDRAW: 'normal',
                TOGGLE_LABEL: 'labeling',
                TOGGLE_LINEDRAW: 'drawing_line',
                TOGGLE_MOVE: 'moving_box'
        	}
        }
    }
})


const asciiService = interpret(asciiMachine).start()
asciiService.send('INIT')


function drawBox ({ minCol, minRow, maxCol, maxRow, fill, labels }) {
	//const boxPieces = [ '└', '┘', '┐', '┌', '-', '|' ]
    const boxPieces = [
        CharCode.boxDrawingsLightUpAndRight, // '└', 
        CharCode.boxDrawingsLightUpAndLeft, //'┘',
        CharCode.boxDrawingsLightDownAndLeft, //'┐',
        CharCode.boxDrawingsLightDownAndRight, //'┌',
        
        CharCode.boxDrawingsLightHorizontal, //'-'
        CharCode.boxDrawingsLightVertical // '|'
    ]

	const borderColor = 'black' //'#333'

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


    for (const label of labels)
        drawLabel(label)
}


function drawPath (start, end) {

    // render the line using the relative line start if connected box is present
    const startPoint = start.box ? ({ col: start.box.minCol + start.point.col, row: start.box.minRow + start.point.row }) : start.point

    const endPoint = end.box ? ({ col: end.box.minCol + end.point.col, row: end.box.minRow + end.point.row }) : end.point

    const path = pathLine(start.point.side, startPoint, endPoint)

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

        if (direction === 'left')
            for (let c=start[0]; c >= end[0]; c--)
                cells.push({ col: c, row: start[1], direction })

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
                char = CharCode.boxDrawingsLightVerticalAndLeft //'┤'
            if (cell.direction === 'right')
                char = CharCode.boxDrawingsLightVerticalAndRight //'├'
            if (cell.direction === 'up')
                char = CharCode.boxDrawingsLightUpAndHorizontal //'┴'
            if (cell.direction === 'down')
                char = CharCode.boxDrawingsLightDownAndHorizontal //'┬'
        } else if (idx === cells.length - 1) {
            if (cell.direction === 'left')
                char = CharCode.blackLeftPointingPointer //'◀'
            if (cell.direction === 'right')
                char = CharCode.blackRightPointingPointer //'▶'
            if (cell.direction === 'up')
                char = CharCode.blackUpPointingTriangle //'▲'
            if (cell.direction === 'down')
                char = CharCode.blackDownPointingTriangle //'▼'

        } else if (lastDirection !== cell.direction) {
            if (lastDirection === 'right' && cell.direction === 'up')
                char = CharCode.boxDrawingsLightUpAndLeft //'┘'
            if (lastDirection === 'down' && cell.direction === 'left')
                char = CharCode.boxDrawingsLightUpAndLeft //'┘'

            if (lastDirection === 'left' && cell.direction === 'up')
                char = CharCode.boxDrawingsLightUpAndRight //char = '└'
            if (lastDirection === 'down' && cell.direction === 'right')
                char = CharCode.boxDrawingsLightUpAndRight //char = '└'

            if (lastDirection === 'left' && cell.direction === 'down')
                char = CharCode.boxDrawingsLightDownAndRight //'┌'
            if (lastDirection === 'up' && cell.direction === 'right')
                char = CharCode.boxDrawingsLightDownAndRight //'┌',    

            if (lastDirection === 'right' && cell.direction === 'down')
                char = CharCode.boxDrawingsLightDownAndLeft //'┐'
            if (lastDirection === 'up' && cell.direction === 'left')
                char = CharCode.boxDrawingsLightDownAndLeft //'┐'
        } else {
            if (cell.direction === 'left' || cell.direction === 'right')
                char = CharCode.boxDrawingsLightHorizontal //'-'
            if (cell.direction === 'up' || cell.direction === 'down')
                char = CharCode.boxDrawingsLightVertical //'|'
        }

        lastDirection = cell.direction
        display.draw(cell.col, cell.row, char, 'black')
    })
}


function clear () {
    display.clear()
    /*
	for (let r=0; r < model.rows; r++)
		for (let c=0; c < model.cols; c++)
			display.draw(c, r, '.', 'whitesmoke')
        */
}


function drawLabel (label) {
    const startCol = label.box.minCol + label.point[0]
    const startRow = label.box.minRow + label.point[1]
    display.drawText(startCol, startRow, label.text, 'black')
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

		drawBox({ minCol, minRow, maxCol, maxRow, labels: [ ], fill: true })
	}

    for (const line of context.lines)
        drawPath(line.start, line.end)

	if (context.activeLine)
		drawPath(context.activeLine.start, context.activeLine.end)



    if (context.labelingBox)
        drawLabel(context.labelingBox)

    display.render()
}


function animate () {
	draw(asciiMachine.initialState.context)
	requestAnimationFrame(animate)
}


//animate()

/*
window.addEventListener('resize', function () {
    // TODO: resize the grid based on screen dimensions
})

//display.drawText(5, 5, 'Here goes something!')
*/
