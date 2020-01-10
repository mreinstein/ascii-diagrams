import Display          from '/node_modules/rot-js/lib/display/display.js'
import { createMachine,
         interpret }    from '/node_modules/@xstate/fsm/es/index.js'
import bresenham        from '/bresenham.js'


/*
TODO:

* draw directional line between boxes
* move box
* remove line
* put text label in box
* put text label on line

*/


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



const asciiMachine = createMachine({
	initial: 'uninitialized',

    // object containing all shared state for this machine
    context: {
        activeBox: undefined,
        activeLine: undefined,

        downPos: undefined,

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
            	const lineToggle = document.querySelector('button')
            	lineToggle.onclick = function () {
            		asciiService.send('TOGGLE_LINEDRAW')
            	}

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
            	DRAW_BOX: 'drawing_box'
            }
        },
        drawing_line: {
        	entry: function (context) {
        		document.querySelector('button').style.color = 'dodgerblue'

        		container.onmousedown = function (ev) {
        			context.activeLine = {
        				currentPos: display.eventToPosition(ev),
        				downPos: display.eventToPosition(ev)
        			}

        			container.onmousemove = function (ev) {
	        			context.activeLine.currentPos = display.eventToPosition(ev)
						draw(context)
	        		}
        		}

        		container.onmouseup = function (ev) {
        			context.lines.push({ ...context.activeLine })
        			context.activeLine = undefined
        			container.onmousemove = undefined
        			draw(context)
        		}

        	},
        	exit: function (context) {
        		document.querySelector('button').style.color = 'white'
        		context.activeLine = undefined
        		container.onmousemove = undefined
        		container.onmousedown = undefined
        		container.onmouseup = undefined
        	},
        	on: {
        		TOGGLE_LINEDRAW: 'normal',
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


function drawLine (line) {
	const l = bresenham(line.downPos[1], line.downPos[0], line.currentPos[1], line.currentPos[0])
	for (const next of l)
		display.draw(next.y, next.x, '#', 'dodgerblue')
}


function clear () {
	for (let r=0; r < model.rows; r++)
		for (let c=0; c < model.cols; c++)
			display.draw(r, c, '.', 'whitesmoke')
}


function draw (context) {
	clear()

	for (const line of context.lines)
		drawLine(line)

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

	if (context.activeLine)
		drawLine(context.activeLine)
}

window.addEventListener('resize', function () {
	// TODO: resize the grid based on screen dimensions
})


//display.drawText(5, 5, 'Here goes something!')


function animate () {
	draw(asciiMachine.initialState.context)
	requestAnimationFrame(animate)
}

animate()
