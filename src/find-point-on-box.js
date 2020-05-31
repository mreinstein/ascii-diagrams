// given a box and a point on the box, determine the
// point on the edge of the box closest to the provided point
// expressed in coordinates relative to the box top,left corner
//
// @param Object box { minCol, minRow, maxCol, maxRow }
export default function findClosestPointOnBox (col, row, box) {
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

    let absPoint

    if (side === 'left')
        absPoint = { col: box.minCol, row }
    else if (side === 'right')
        absPoint = { col: box.maxCol, row }
    else if (side === 'bottom')
        absPoint = { col, row: box.maxRow }
    else if (side === 'top')
        absPoint = { col, row: box.minRow }

    return { col: absPoint.col - box.minCol, row: absPoint.row - box.minRow, side }
}