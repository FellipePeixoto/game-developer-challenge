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
