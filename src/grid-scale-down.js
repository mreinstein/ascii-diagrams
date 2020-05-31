// destructively decrease the grid resolution
// @param int factor amount to decrease. e.g., factor 3 on a 6x9 grid yields a 2x3 grid
// @return ndarray the new, scaled ndarray
export default function scaleDown (grid, factor) {
  const rows = grid.shape[0]
  const cols = grid.shape[1]

  const newRows = rows / factor
  const newCols = cols / factor

  // sum up all the values from the old array into new
  const sum = new Uint16Array(newRows * newCols).fill(0)

  for (let row=0; row < rows; row++) {
    const newRow = Math.floor(row / factor)

    for (let col=0; col < cols; col++) {
      // determine index into new array
      const newCol = Math.floor(col / factor)
      const idx = newRow * newCols + newCol
      sum[idx] += grid.get(row, col)
    }
  }

  // calculate average and store in the result array
  const factorSq = factor * factor
  const result = new Uint8Array(newRows * newCols)
  for (let row=0; row < newRows; row++) {
    for (let col=0; col < newCols; col++) {
      const idx = row * newCols + col
      result[idx] = Math.ceil(sum[idx] / factorSq)
    }
  }

  return ndarray(result, [ newRows, newCols ])
}
