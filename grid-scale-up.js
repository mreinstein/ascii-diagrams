
// non-destructively increase the grid resolution
// @param int factor amount to decrease. e.g., factor 3 on a 2x4 grid yields a 6x12 grid
// @return ndarray the new, scaled ndarray
export default function scaleUp (grid, factor) {
  const rows = grid.shape[0]
  const cols = grid.shape[1]

  const newRows = rows * factor
  const newCols = cols * factor

  const result = new Uint8Array(newRows * newCols)
  const pos = { row: 0, col: 0 }

  for (let row=0; row < rows; row++) {
    pos.row = row * factor
    
    for (let col=0; col < cols; col++) {
      const cell = grid.get(row, col)
      pos.col = col * factor
      const startIdx = (pos.row * newCols) + pos.col
      for (let i=0; i < factor; i++)
        for (let j=0; j < factor; j++)
          result[startIdx + i + (j * newCols)] = cell
    }
  }

  return ndarray(result, [ newRows, newCols ])
}
