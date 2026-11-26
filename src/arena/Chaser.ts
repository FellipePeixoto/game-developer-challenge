import { Rectangle, type PointData } from 'pixi.js'
import { gameplayConfig } from './gameplayConfig'
import type { Physics } from './Physics'

export class Chaser {
  private readonly hull = new Rectangle()
  private state: 'waiting' | 'pursuing' | 'exploding' | 'removed' = 'waiting'
  private heading = 0
  private explosionTime = 0

  get phase() { return this.state }
  get x() { return this.hull.x + this.hull.width / 2 }
  get y() { return this.hull.y + this.hull.height / 2 }
  get rotation() { return this.heading }
  get explosionOpacity() { return this.explosionTime / gameplayConfig.chaser.explosionSeconds }

  setHull(x: number, y: number, width: number, height: number): void {
    this.hull.x = x - width / 2
    this.hull.y = y - height / 2
    this.hull.width = width
    this.hull.height = height
  }

  startPursuit(): void {
    this.state = 'pursuing'
  }

  update(deltaSeconds: number, scale: number, player: PointData, physics: Physics): boolean {
    if (this.state === 'exploding') {
      this.explosionTime = Math.max(0, this.explosionTime - deltaSeconds)
      if (this.explosionTime === 0) this.state = 'removed'
    }
    if (this.state !== 'pursuing') return false

    const dx = player.x - this.x
    const dy = player.y - this.y
    const distance = Math.hypot(dx, dy)
    if (distance > 0) {
      // The bow points down in the source texture.
      const rotation = Math.atan2(-dx, dy)
      const fraction = Math.min(1, gameplayConfig.chaser.movementSpeed * scale * deltaSeconds / distance)
      const nextX = this.x + dx * fraction
      const nextY = this.y + dy * fraction
      if (physics.canPlace(this.hull, rotation, nextX, nextY)) {
        this.setHull(nextX, nextY, this.hull.width, this.hull.height)
        this.heading = rotation
      } else if (physics.canPlace(this.hull, rotation, this.x, this.y)) {
        this.heading = rotation
      }
    }

    if (!physics.overlapsShip(this.hull, this.heading, this.x, this.y)) return false
    this.state = 'exploding'
    this.explosionTime = gameplayConfig.chaser.explosionSeconds
    return true
  }
}

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
