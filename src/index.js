import exportToAscii     from './export.js'
import closestPointOnBox from './find-point-on-box.js'
import getPathCells      from './get-path-cells.js'
import tileMap           from './tile-map.js'
import { Display, interpret, createMachine, dialogPolyfill } from './deps.js'


const model = {
    columns: 0,
    rows: 0,
    font: {
        width: 0,
        height: 0
    }
}


function loadFont ({ width, height }) {
    
    model.font.width = width
    model.font.height = height
    model.columns = Math.ceil(window.outerWidth / width)
    model.rows = Math.ceil(window.outerHeight / height)

    asciiMachine = createMachine({
        initial: 'normal',

        // object containing all shared state for this machine
        context: {
            activeBox: undefined,
            activeLine: undefined,

            movingBox: undefined,
            movingText: undefined,

            resizingBox: undefined,

            labelingBox: undefined,

            boxes: [ ],
            lines: [ ],
            currentPos: undefined,

            boxResizing: false,

            ...model
        },

        states: {
            normal: {
                entry: function (context) {
                    window.addEventListener('keydown', keyShortcuts)
                },
                on: {
                    EXPORT: 'exporting',
                    TOGGLE_BOXDRAW: 'drawing_box',
                    TOGGLE_LABEL: 'labeling',
                    TOGGLE_LINEDRAW: 'drawing_line',
                    TOGGLE_MOVE: 'moving_box',
                    TOGGLE_MOVETEXT: 'moving_label',
                    DELETE: 'delete',
                    DRAW_BOX: 'drawing_box',
                    TOGGLE_RESIZEBOX: 'resizing_box'
                }
            },

            exporting: {
                entry: function (context) {
                    exportButton.classList.add('active-command')
                    const dialog = document.querySelector('dialog')

                    const textarea = dialog.querySelector('textarea')
                    const exportedResult = exportToAscii(context)
                    const columnCount = exportedResult.indexOf('\n')
                    textarea.setAttribute('cols', columnCount)
                    textarea.value = exportedResult

                    dialog.show()
                },
                exit: function (context) {
                    exportButton.classList.remove('active-command')
                    const dialog = document.querySelector('dialog')
                    dialog.close()
                },
                on: {
                    EXPORT: 'normal',
                    TOGGLE_BOXDRAW: 'drawing_box',
                    TOGGLE_LABEL: 'labeling',
                    TOGGLE_LINEDRAW: 'drawing_line',
                    TOGGLE_MOVE: 'moving_box',
                    TOGGLE_MOVETEXT: 'moving_label',
                    DELETE: 'delete',
                    DRAW_BOX: 'drawing_box',
                    TOGGLE_RESIZEBOX: 'resizing_box'
                }
            },

            delete: {
                entry: function (context) {
                    deleteButton.classList.add('active-command')

                    container.onmousedown = function (ev) {
                        const [ col, row ] = display.eventToPosition(ev)
                        const line = findLine(col, row, context.lines)
                        if (line) {
                            const idx = context.lines.indexOf(line)
                            context.lines.splice(idx, 1)
                            return
                        }

                        const box = findBox(col, row, context.boxes)
                        if (box) {
                           const idx = context.boxes.indexOf(box)
                            context.boxes.splice(idx, 1)
                            for (let i=context.lines.length-1; i >= 0; i--) {
                                const line = context.lines[i]
                                if (line.start.box === box || line.end.box === box)
                                    context.lines.splice(i, 1)
                            }
                        }
                    }
                },
                exit: function (context) {
                    deleteButton.classList.remove('active-command')
                    container.onmousedown = undefined
                },
                on: {
                    EXPORT: 'exporting',
                    TOGGLE_BOXDRAW: 'drawing_box',
                    TOGGLE_LABEL: 'labeling',
                    TOGGLE_LINEDRAW: 'drawing_line',
                    TOGGLE_MOVE: 'moving_box',
                    TOGGLE_MOVETEXT: 'moving_label',
                    DELETE: 'normal',
                    DRAW_BOX: 'drawing_box',
                    TOGGLE_RESIZEBOX: 'resizing_box'
                }
            },

            drawing_line: {
                entry: function (context) {
                    lineToggle.classList.add('active-command')

                    container.onmousedown = function (ev) {
                        const [ col, row ] = display.eventToPosition(ev)
                        const box = findBox(col, row, context.boxes)
                        if (!box)
                            return

                        const point = closestPointOnBox(col, row, box)

                        context.activeLine = {
                            start: { box, point },
                            end: { box, point },
                            labels: [ ]
                        }

                        container.onmousemove = function (ev) {
                            const [ col, row ] = display.eventToPosition(ev)
                            const box = findBox(col, row, context.boxes)

                            if (box)
                                context.activeLine.end.point = closestPointOnBox(col, row, box)
                            else
                               context.activeLine.end.point = { col, row }

                            context.activeLine.end.box = box
                        }
                    }

                    container.onmouseup = function (ev) {
                        if (context.activeLine)
                             context.lines.push({ ...context.activeLine })
                        context.activeLine = undefined
                        container.onmousemove = undefined
                    }

                },
                exit: function (context) {
                    lineToggle.classList.remove('active-command')
                    context.activeLine = undefined
                    container.onmousemove = undefined
                },
                on: {
                    EXPORT: 'exporting',
                    DELETE: 'delete',
                    TOGGLE_BOXDRAW: 'drawing_box',
                    TOGGLE_LABEL: 'labeling',
                    TOGGLE_LINEDRAW: 'normal',
                    TOGGLE_MOVE: 'moving_box',
                    TOGGLE_MOVETEXT: 'moving_label',
                    TOGGLE_RESIZEBOX: 'resizing_box'
                }
            },

            moving_label: {
                entry: function (context) {
                    moveLabelButton.classList.add('active-command')

                    container.onmousedown = function (ev) {
                        const [ col, row ] = display.eventToPosition(ev)
                        context.movingText = findText(col, row, context.lines, context.boxes)
                    }

                    container.onmousemove = function (ev) {
                        if (!context.movingText)
                            return

                        const [ col, row ] = display.eventToPosition(ev)

                        const label = context.movingText

                        if (label.line) {          
                            const minCol = label.line.start.box.minCol + label.line.start.point.col //+ label.point[0]
                            const minRow = label.line.start.box.minRow + label.line.start.point.row //+ label.point[1]

                            // the label is on a line
                            context.movingText.point[0] = col - minCol
                            context.movingText.point[1] = row - minRow
                            
                        } else {
                            // the label is on a box
                            context.movingText.point[0] = col - context.movingText.box.minCol
                            context.movingText.point[1] = row - context.movingText.box.minRow
                        }
                    }

                    container.onmouseup = function (ev) {
                        const [ col, row ] = display.eventToPosition(ev)
                        context.movingText = undefined
                    }

                },
                exit: function (context) {
                    moveLabelButton.classList.remove('active-command')
                    context.movingText = undefined
                    container.onmousedown = undefined
                    container.onmousemove = undefined
                    container.onmouseup = undefined
                },
                on: {
                    EXPORT: 'exporting',
                    DELETE: 'delete',
                    TOGGLE_BOXDRAW: 'drawing_box',
                    TOGGLE_LABEL: 'labeling',
                    TOGGLE_LINEDRAW: 'drawing_line',
                    TOGGLE_MOVE: 'moving_box',
                    TOGGLE_MOVETEXT: 'normal',
                    TOGGLE_RESIZEBOX: 'resizing_box'
                }
            },

            labeling: {
                entry: function (context) {
                    labelToggle.classList.add('active-command')

                    const textarea = document.querySelector('textarea')

                    container.onmousedown = function (ev) {
                        if (context.labelingBox) {
                            asciiService.send('TOGGLE_LABEL')
                            return
                        }

                        const [ col, row ] = display.eventToPosition(ev)
                        const box = findBox(col, row, context.boxes)

                        const line = box ? undefined : findLine(col, row, context.lines)

                        textarea.style.display = (box || line) ? 'block' : 'none'
                        if (textarea.style.display === 'none') {
                            if (context.labelingBox) {
                                if (context.labelingBox.box)
                                    context.labelingBox.box.labels.push(context.labelingBox)
                                else
                                    context.labelingBox.line.labels.push(context.labelingBox)
                            }
                            context.labelingBox = undefined
                            textarea.value = ''
                            return
                        } else {
                            window.removeEventListener('keydown', keyShortcuts)
                        }

                        // need to do this on the next event tick
                        setTimeout(() => textarea.focus(), 0)

                        if (box) {
                            const relativeCol = col - box.minCol
                            const relativeRow = row - box.minRow

                            context.labelingBox = {
                                box,
                                point: [ relativeCol, relativeRow ],
                                text: ''
                            }
                        } else {
                            const lineStartCol = line.start.box.minCol + line.start.point.col
                            const lineStartRow = line.start.box.minRow + line.start.point.row

                            const relativeCol = col - lineStartCol
                            const relativeRow = row - lineStartRow

                            context.labelingBox = {
                                line,
                                point: [ relativeCol, relativeRow ],
                                text: ''
                            }
                        }
                    }

                    textarea.onkeyup = function () {
                        if (!context.labelingBox)
                            return
                        context.labelingBox.text = textarea.value
                    }

                },
                exit: function (context) {

                    if (context.labelingBox) {
                        if (context.labelingBox.box)
                            context.labelingBox.box.labels.push(context.labelingBox)
                        else
                            context.labelingBox.line.labels.push(context.labelingBox)
                    }

                    const textarea = document.querySelector('textarea')

                    if (textarea.style.display === 'block')
                        window.addEventListener('keydown', keyShortcuts)
                    
                    textarea.value = ''
                    textarea.onkeyup = undefined
                    textarea.style.display = 'none'
                    container.onmousedown = undefined
                    context.labelingBox = undefined
                    labelToggle.classList.remove('active-command')
                },
                on: {
                    EXPORT: 'exporting',
                    DELETE: 'delete',
                    TOGGLE_BOXDRAW: 'drawing_box',
                    TOGGLE_LABEL: 'normal',
                    TOGGLE_LINEDRAW: 'drawing_line',
                    TOGGLE_MOVE: 'moving_box',
                    TOGGLE_MOVETEXT: 'moving_label',
                    DRAW_BOX: 'drawing_box',
                    TOGGLE_RESIZEBOX: 'resizing_box'
                }
            },
            moving_box: {
                entry: function (context) {
                    moveToggle.classList.add('active-command')

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
                    }

                    container.onmouseup = function (ev) {
                        context.movingBox = undefined
                    }

                },
                exit: function (context) {
                    container.onmouseup = container.onmousedown = container.onmousemove = undefined
                    moveToggle.classList.remove('active-command')
                },
                on: {
                    EXPORT: 'exporting',
                    DELETE: 'delete',
                    TOGGLE_BOXDRAW: 'drawing_box',
                    TOGGLE_LABEL: 'labeling',
                    TOGGLE_LINEDRAW: 'drawing_line',
                    TOGGLE_MOVE: 'normal',
                    TOGGLE_MOVETEXT: 'moving_label',
                    TOGGLE_RESIZEBOX: 'resizing_box'
                }
            },
            drawing_box: {
                entry: function (context) {
                    boxToggle.classList.add('active-command')

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
                    }
                },
                exit: function (context) {
                    boxToggle.classList.remove('active-command')
                    container.onmousedown = undefined
                    container.onmousemove = undefined
                    container.onmouseup = undefined
                    context.activeBox = undefined
                },
                on: {
                    EXPORT: 'exporting',
                    DELETE: 'delete',
                    TOGGLE_BOXDRAW: 'normal',
                    TOGGLE_LABEL: 'labeling',
                    TOGGLE_LINEDRAW: 'drawing_line',
                    TOGGLE_MOVE: 'moving_box',
                    TOGGLE_MOVETEXT: 'moving_label',
                    TOGGLE_RESIZEBOX: 'resizing_box'
                }
            },
            resizing_box: {
                entry: function (context) {
                    resizeBoxButton.classList.add('active-command')
                    context.boxResizing = true

                    container.onmousedown = function (ev) {
                        const [ col, row ] = display.eventToPosition(ev)
                        const box = findBox(col, row, context.boxes)
                        if (box && box.maxCol-1 === col && box.maxRow-1 === row)
                            context.resizingBox = box
                    }

                    container.onmousemove = function (ev) {   
                        if (!context.resizingBox)
                            return

                        const [ col, row ] = display.eventToPosition(ev)

                        if (col <= context.resizingBox.minCol || row <= context.resizingBox.minRow)
                            return

                        context.resizingBox.maxCol = col + 1
                        context.resizingBox.maxRow = row + 1

                        // find all lines that originate on this box
                        context.lines.filter((line) => {
                            return line.start.box === context.resizingBox
                        }).map((line) => {
                            // update the line start position
                            const globalCol = line.start.point.col + line.start.box.minCol
                            const globalRow = line.start.point.row + line.start.box.minRow
                            line.start.point = closestPointOnBox(globalCol, globalRow, line.start.box)
                        })

                        // find all lines that terminate at this box
                        context.lines.filter((line) => {
                            return line.end.box === context.resizingBox
                        }).map((line) => {
                            // update the line start position
                            const globalCol = line.end.point.col + line.end.box.minCol
                            const globalRow = line.end.point.row + line.end.box.minRow
                            line.end.point = closestPointOnBox(globalCol, globalRow, line.end.box)
                        })
                    }

                    container.onmouseup = function (ev) {
                        context.resizingBox = undefined
                    }

                },
                exit: function (context) {
                    container.onmouseup = container.onmousedown = container.onmousemove = undefined
                    resizeBoxButton.classList.remove('active-command')
                    context.boxResizing = false
                },
                on: {
                    EXPORT: 'exporting',
                    DELETE: 'delete',
                    TOGGLE_BOXDRAW: 'drawing_box',
                    TOGGLE_LABEL: 'labeling',
                    TOGGLE_LINEDRAW: 'drawing_line',
                    TOGGLE_MOVE: 'moving_box',
                    TOGGLE_MOVETEXT: 'moving_label',
                }
            }
        }
    })

    asciiService = interpret(asciiMachine).start()

    const img = new Image();

    img.src = `/font/font_${model.font.width}_${model.font.height}.png`;
    img.onload = _ => {
        for (const glyph in tileMap) {
            const idx = tileMap[glyph];

            // the font files always have 32 columns
            const sx = (idx % 32) * model.font.width;
            const sy = (idx / 32 | 0) * model.font.height;

            tileMap[glyph] = [ sx, sy ];
        }

        display = new Display({
            bg: 'white',
            layout: 'tile-gl',
            tileColorize: true,
            tileWidth: model.font.width,
            tileHeight: model.font.height,
            tileSet: img,
            tileMap,

            // defaults to 80x25
            width: model.columns,
            height: model.rows
        })

        container = display.getContainer()
        document.body.appendChild(container)
        animate()
    }
}


let display, container, asciiMachine, asciiService

// handle browsers that don't natively support <dialog> yet
const dlg = document.querySelector('dialog')
dialogPolyfill.registerDialog(dlg)

const [ boxToggle, labelToggle, lineToggle, moveToggle, moveLabelButton, resizeBoxButton, deleteButton, exportButton ] = document.querySelectorAll('button')
const hints = document.querySelector('#hints')

document.querySelectorAll('.shortcut').forEach((s) =>{
 
    s.onmouseenter = function () {
        s.style.color = 'deeppink'
        if (s.innerText.length)
            hints.innerText = 'Keyboard Shortcut Key:  ' + s.innerText
    }

    s.onmouseleave = function () {
        s.style.color = ''
        hints.innerText = ''
    }
})

lineToggle.onclick = function () {
    asciiService.send('TOGGLE_LINEDRAW')
}

lineToggle.onmouseenter = function () {
    hints.innerText = 'Draw a line between 2 boxes.'
}

lineToggle.onmouseleave = function () {
    hints.innerText = ''
}

moveToggle.onclick = function () {
    asciiService.send('TOGGLE_MOVE')
}

moveToggle.onmouseenter = function () {
    hints.innerText = 'Move an existing box.'
}

moveToggle.onmouseleave = function () {
    hints.innerText = ''
}

moveLabelButton.onclick = function () {
    asciiService.send('TOGGLE_MOVETEXT')
}

moveLabelButton.onmouseenter = function () {
    hints.innerText = 'Move existing text.'
}

moveLabelButton.onmouseleave = function () {
    hints.innerText = ''
}

resizeBoxButton.onclick = function () {
    asciiService.send('TOGGLE_RESIZEBOX')
}

resizeBoxButton.onmouseenter = function () {
    hints.innerText = 'Resize an existing box.'
}

resizeBoxButton.onmouseleave = function () {
    hints.innerText = ''
}

boxToggle.onclick = function () {
    asciiService.send('TOGGLE_BOXDRAW')
}

boxToggle.onmouseenter = function () {
    hints.innerText = 'Draw a box.'
}

boxToggle.onmouseleave = function () {
    hints.innerText = ''
}

labelToggle.onclick = function () {
    asciiService.send('TOGGLE_LABEL')
}

labelToggle.onmouseenter = function () {
    hints.innerText = 'Write text on a box or a line.'
}

labelToggle.onmouseleave = function () {
    hints.innerText = ''
}

deleteButton.onclick = function () {
    asciiService.send('DELETE')
}

deleteButton.onmouseenter = function () {
    hints.innerText = 'Delete a box or a line.'
}

deleteButton.onmouseleave = function () {
    hints.innerText = ''
}

exportButton.onclick = function () {
    asciiService.send('EXPORT')
}

exportButton.onmouseenter = function () {
    hints.innerText = 'Export a diagram to text, embeddable in markdown or source code.'
}

exportButton.onmouseleave = function () {
    hints.innerText = ''
}


function keyShortcuts (ev) {
    if (ev.key === 'b')
        asciiService.send('TOGGLE_BOXDRAW')
    
    if (ev.key === 't')
        asciiService.send('TOGGLE_LABEL')

    if (ev.key === 'l')
        asciiService.send('TOGGLE_LINEDRAW')

    if (ev.key === 'm')
        asciiService.send('TOGGLE_MOVE')

    if (ev.key === 'n')
        asciiService.send('TOGGLE_MOVETEXT')

    if (ev.key === 'r')
        asciiService.send('TOGGLE_RESIZEBOX')

    if (ev.key === 'd')
        asciiService.send('DELETE')

    if (ev.key === 'e')
        asciiService.send('EXPORT')   
}


function findBox (col, row, boxes) {
    return boxes.find((b) => col >= b.minCol && col <= b.maxCol && row >= b.minRow && row <= b.maxRow)
}


function findLine (col, row, lines) {
    for (const line of lines) {
        const cells = getPathCells(line)
        for (const cell of cells)
            if (cell.row === row && cell.col === col)
                return line
    }
}


function getBoxLabelBounds (label) {
    const minCol = label.box.minCol + label.point[0]
    const minRow = label.box.minRow + label.point[1]

    const lines = label.text.split('\n')
    const maxRow = minRow + lines.length - 1
    let maxLength = 0
    for (const line of lines)
        maxLength = Math.max(maxLength, line.length)
    const maxCol = minCol + maxLength - 1
   
    return { minCol, minRow, maxCol, maxRow }
}



function getLineLabelBounds (label) {
    const minCol = label.line.start.box.minCol + label.line.start.point.col + label.point[0]
    const minRow = label.line.start.box.minRow + label.line.start.point.row + label.point[1]

    const lines = label.text.split('\n')
    const maxRow = minRow + lines.length - 1
    let maxLength = 0
    for (const line of lines)
        maxLength = Math.max(maxLength, line.length)
    const maxCol = minCol + maxLength - 1
   
    return { minCol, minRow, maxCol, maxRow }
}


function findText (col, row, lines, boxes) {
    for (const box of boxes) {
        const label = box.labels.find((label) => {
            const bounds = getBoxLabelBounds(label)
            return col >= bounds.minCol && col <= bounds.maxCol && row >= bounds.minRow && row <= bounds.maxRow
        })

        if (label)
            return label
    }

    for (const line of lines) {
        const label = line.labels.find((label) => {
            const bounds = getLineLabelBounds(label)
            return col >= bounds.minCol && col <= bounds.maxCol && row >= bounds.minRow && row <= bounds.maxRow
        })

        if (label)
            return label
    }
}


function drawBox ({ minCol, minRow, maxCol, maxRow, fill, resizing, labels }) {
	const borderColor = '#333'

	display.draw(minCol, minRow, '┌', borderColor)
	display.draw(maxCol, maxRow, '┘', borderColor)
	display.draw(maxCol, minRow, '┐', borderColor)
	display.draw(minCol, maxRow, '└', borderColor)

	for (let c=minCol+1; c < maxCol; c++) {
		display.draw(c, maxRow, '─', borderColor)
		display.draw(c, minRow, '─', borderColor)
	}

	for (let r=minRow+1; r < maxRow; r++) {
		display.draw(minCol, r, '│', borderColor)
		display.draw(maxCol, r, '│', borderColor)
	}

	if (fill)
		for (let r=minRow+1; r < maxRow; r++)
			for (let c=minCol+1; c < maxCol; c++)
				display.draw(c, r, '█', 'white') // CharCode.fullBlock

    for (const label of labels)
        drawLabel(label)

    if (resizing)
        display.draw(maxCol-1, maxRow-1, '▒', 'dodgerblue')
}


function drawPath (line) {
    const cells = getPathCells(line)

    if (!cells.length)
        return

    let lastDirection = cells[0].direction

    cells.forEach(function (cell, idx) {
        let char

        if (idx === 0) {

            // TODO: move this to the box drawing code to avoid double rendering characters
            if (cell.direction === 'left')
                char = '┤' //CharCode.boxDrawingsLightVerticalAndLeft //
            if (cell.direction === 'right')
                char = '├' //CharCode.boxDrawingsLightVerticalAndRight //
            if (cell.direction === 'up')
                char = '┴' //CharCode.boxDrawingsLightUpAndHorizontal //
            if (cell.direction === 'down')
                char = '┬' //CharCode.boxDrawingsLightDownAndHorizontal //


        } else if (idx === cells.length - 1) {
            if (cell.direction === 'left')
                char = '◀' //CharCode.blackLeftPointingPointer //
            if (cell.direction === 'right')
                char = '▶' //CharCode.blackRightPointingPointer //
            if (cell.direction === 'up')
                char = '▲' //CharCode.blackUpPointingTriangle //
            if (cell.direction === 'down')
                char = '▼' // CharCode.blackDownPointingTriangle //

        } else if (lastDirection !== cell.direction) {
            if (lastDirection === 'right' && cell.direction === 'up')
                char = '┘' //CharCode.boxDrawingsLightUpAndLeft //
            if (lastDirection === 'down' && cell.direction === 'left')
                char = '┘' //CharCode.boxDrawingsLightUpAndLeft //

            if (lastDirection === 'left' && cell.direction === 'up')
                char = '└' // CharCode.boxDrawingsLightUpAndRight //char =
            if (lastDirection === 'down' && cell.direction === 'right')
                char = '└' // CharCode.boxDrawingsLightUpAndRight //char =

            if (lastDirection === 'left' && cell.direction === 'down')
                char = '┌' //CharCode.boxDrawingsLightDownAndRight //
            if (lastDirection === 'up' && cell.direction === 'right')
                char = '┌' // CharCode.boxDrawingsLightDownAndRight //

            if (lastDirection === 'right' && cell.direction === 'down')
                char = '┐' // CharCode.boxDrawingsLightDownAndLeft //
            if (lastDirection === 'up' && cell.direction === 'left')
                char = '┐' //CharCode.boxDrawingsLightDownAndLeft //
        } else {
            if (cell.direction === 'left' || cell.direction === 'right')
                char = '─' // CharCode.boxDrawingsLightHorizontal //
            if (cell.direction === 'up' || cell.direction === 'down')
                char = '│' // CharCode.boxDrawingsLightVertical //
        }

        lastDirection = cell.direction
        display.draw(cell.col, cell.row, char, '#333')
    })

    for (const label of line.labels)
        drawLabel(label)
}


function drawLabel (label) {
    let startCol, startRow
    if (label.box) {
        startCol = label.box.minCol + label.point[0]
        startRow = label.box.minRow + label.point[1]
    } else {
        const { line } = label
        startCol = line.start.box.minCol + line.start.point.col + label.point[0]
        startRow = line.start.box.minRow + line.start.point.row + label.point[1]
    }

    drawText(startCol, startRow, label.text, '#333')
}


function drawText (startCol, startRow, str, fg) {
    const rows = str.split('\n')
    let currentRow = startRow

    for (const row of rows) {
        for (let i=0; i < row.length; i++)
            display.draw(startCol + i, currentRow, row[i], fg)

        currentRow++
    }
}


function draw (context) {
    display.clear();

	for (const box of context.boxes)
		drawBox({ ...box, resizing: context.boxResizing, fill: true })

	if (context.activeBox) {
		const [ col, row ] = context.activeBox.currentPos

		const minCol = Math.min(col, context.activeBox.downPos[0])
		const maxCol = Math.max(col, context.activeBox.downPos[0])

		const minRow = Math.min(row, context.activeBox.downPos[1])
		const maxRow = Math.max(row, context.activeBox.downPos[1])

		drawBox({ minCol, minRow, maxCol, maxRow, labels: [ ], resizing: context.boxResizing, fill: true })
	}

    for (const line of context.lines)
        drawPath(line)

	if (context.activeLine)
		drawPath(context.activeLine)

    if (context.labelingBox)
        drawLabel(context.labelingBox)
}


function animate () {
	draw(asciiMachine.initialState.context)
	requestAnimationFrame(animate)
}


loadFont({ width: 8, height: 10 })


/*
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


window.addEventListener('resize', function () {
    // TODO: resize the grid based on screen dimensions
})
*/
