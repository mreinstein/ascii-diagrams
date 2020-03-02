// given a box and a point on the box, determine the
// point on the edge of the box closest to the provided point
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

    if (side === 'left')
        return { col: box.minCol, row, side }

    if (side === 'right')
        return { col: box.maxCol, row, side }

    if (side === 'bottom')
        return { col, row: box.maxRow, side }

    return { col, row: box.minRow, side }
}