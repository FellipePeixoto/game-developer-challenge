import { Rectangle, type PointData } from 'pixi.js'

interface SpawnOptions {
  bounds: Rectangle
  obstacles: readonly Rectangle[]
  player: PointData
  width: number
  height: number
  minimumDistance: number
  random: () => number
}

export function findChaserSpawn({
  bounds, obstacles, player, width, height, minimumDistance, random,
}: SpawnOptions): Rectangle | undefined {
  const left = bounds.left + width / 2
  const right = bounds.right - width / 2
  const top = bounds.top + height / 2
  const bottom = bounds.bottom - height / 2
  if (left > right || top > bottom) return

  function safeSpawn(x: number, y: number): Rectangle | undefined {
    if (Math.hypot(x - player.x, y - player.y) < minimumDistance) return
    const hull = new Rectangle(x - width / 2, y - height / 2, width, height)
    if (obstacles.some(obstacle => obstacle.intersects(hull))) return
    return hull
  }

  for (let attempt = 0; attempt < 24; attempt++) {
    const x = left + random() * (right - left)
    const y = top + random() * (bottom - top)
    const hull = safeSpawn(x, y)
    if (hull) return hull
  }

  // Check the outermost valid centers if random sampling finds no clear position.
  for (const [x, y] of [[left, top], [right, top], [left, bottom], [right, bottom]]) {
    const hull = safeSpawn(x, y)
    if (hull) return hull
  }
  return undefined
}
