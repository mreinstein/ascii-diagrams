import getPathCells from './get-path-cells.js'


function expandBox (box, point) {
    if (point[0] < box.minCol)
        box.minCol = point[0]

    if (point[1] < box.minRow)
        box.minRow = point[1]

    if (point[0] > box.maxCol)
        box.maxCol = point[0]

    if (point[1] > box.maxRow)
        box.maxRow = point[1]
}


function getBoundingBox (context) {
   const boundingBox = { }

    for (const box of context.boxes) {
        if (boundingBox.minCol === undefined) {
            boundingBox.minCol = box.minCol
            boundingBox.minRow = box.minRow
            boundingBox.maxCol = box.maxCol
            boundingBox.maxRow = box.maxRow
        }

        expandBox(boundingBox, [ box.minCol, box.minRow ])
        expandBox(boundingBox, [ box.maxCol, box.maxRow ])
    }

    for (const line of context.lines) {

        const start = [
            line.start.box.minCol + line.start.point[0],
            line.start.box.minRow + line.start.point[1],
        ]

        const end = line.end.box ? [
            line.end.box.minCol + line.end.point[0],
            line.end.box.minRow + line.end.point[1],
        ] : [ line.end.point.col, line.end.point.row ]

        if (boundingBox.minCol === undefined) {
            boundingBox.minCol = start[0]
            boundingBox.minRow = start[1]
            boundingBox.maxCol = start[0]
            boundingBox.maxRow = start[1]
        }

        expandBox(boundingBox, start)
        expandBox(boundingBox, end)
    }

    return boundingBox
}


function replaceAt (input, index, replacement) {
    return input.substr(0, index) + replacement + input.substr(index + replacement.length)
}


export default function exportToAscii (context) {
    let result = ''

    const toIndex = function (col, row) {
        const newlineCount = row
        return (row * context.columns) + col + newlineCount
    }

    const write = function (col, row, char) {
        result = replaceAt(result, toIndex(col, row), char)
    }

    const exportLabel = function (label) {
        let startCol, startRow
        if (label.box) {
            startCol = label.box.minCol + label.point[0]
            startRow = label.box.minRow + label.point[1]
        } else {
            const { line } = label
            startCol = line.start.box.minCol + line.start.point.col + label.point[0]
            startRow = line.start.box.minRow + line.start.point.row + label.point[1]
        }

        const rows = label.text.split('\n')
        let currentRow = startRow

        for (const row of rows) {
            for (let i=0; i < row.length; i++)
                write(startCol + i, currentRow, row[i])

            currentRow++
        }
    }

    // find the bounding box that includes all non-whitespace cells
    const boundingBox = getBoundingBox(context)

    for (let row=0; row < context.rows; row++) {
        for (let col=0; col < context.columns; col++) {
            const idx = row * context.columns + col
            result += ' '
        }
        result += '\n'
    }

    for (const b of context.boxes) {
        const { minCol, minRow, maxCol, maxRow, labels } = b

        write(minCol, minRow, '┌')
        write(maxCol, maxRow, '┘')
        write(maxCol, minRow, '┐')
        write(minCol, maxRow, '└')

        for (let c=minCol+1; c < maxCol; c++) {
            write(c, maxRow, '-')
            write(c, minRow, '-')
        }

        for (let r=minRow+1; r < maxRow; r++) {
            write(minCol, r, '│')
            write(maxCol, r, '│')
        }

        for (const label of labels)
            exportLabel(label)
    }

    for (const line of context.lines) {
        const cells = getPathCells(line)

        if (!cells.length)
            continue

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
            write(cell.col, cell.row, char)
        })

        for (const label of line.labels)
            exportLabel(label)
    }

    // trim whitespace
    let out = ''

    for (let r = boundingBox.minRow; r <= boundingBox.maxRow; r++) {
        out += result.substring(toIndex(boundingBox.minCol, r), toIndex(boundingBox.maxCol+1, r) )
        out += '\n'
    }

    return out
}
