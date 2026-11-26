import { Rectangle } from 'pixi.js'

// The fixed 18 × 10 arena frames the reference's 125px tiles at x = -55px.
export const mapColumns = 18
export const mapRows = 10
export const tileSize = 1.25
export const mapLeft = -0.55

// One-based IDs in the supplied 16-column terrain sheet. Zero is open ocean.
export const oceanTile = 73
export const submergedTile = 27
const shallowTiles = new Set([10, 11, 26, 27, 28, 42, 43, 44, 58, 59, 75])
export const arenaMap = [
  [55, 55, 37, 23, 40, 39, 40, 41, 28,  0,  0,  0,  0,  0,  0],
  [43, 59, 22, 23, 24, 36, 56, 57, 28,  0,  0,  0,  0,  0,  0],
  [ 0, 26, 22, 39, 40, 25, 58, 43, 44,  0,  0,  0,  0,  0,  0],
  [ 0, 26, 54, 55, 56, 57, 28,  0,  0,  0,  0,  0,  0,  0,  0],
  [ 0, 42, 43, 43, 43, 43, 44,  0,  0,  0, 10, 11, 11, 11, 11],
  [ 0,  0,  0,  0, 10, 11, 11, 11, 11, 11, 75,  6,  7,  8,  9],
  [ 0,  0,  0,  0, 26,  6,  7,  7,  7,  7, 7, 22, 23, 24, 25],
  [ 0,  0,  0,  0, 26, 22, 23, 23, 23, 23,  23, 23, 23, 40, 41],
] as const

export function isLandTile(tile: number): boolean {
  return tile !== 0 && !shallowTiles.has(tile)
}

export function mapObstacles(width: number, height: number): Rectangle[] {
  const scaleX = width / mapColumns
  const scaleY = height / mapRows
  return arenaMap.flatMap((row, y) =>
    row.flatMap((tile, x) => isLandTile(tile)
      ? [new Rectangle(
          (mapLeft + x * tileSize) * scaleX, y * tileSize * scaleY,
          tileSize * scaleX, tileSize * scaleY,
        )]
      : []),
  )
}
