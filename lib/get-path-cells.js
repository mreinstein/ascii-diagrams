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


export default function getPathCells (line) {
    const { start, end } = line
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

    return cells
}
