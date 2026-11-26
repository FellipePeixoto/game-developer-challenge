import { Rectangle, type PointData } from 'pixi.js'
import { gameplayConfig } from './gameplayConfig'
import type { Physics } from './Physics'

export class Shooter {
  private readonly hull = new Rectangle()
  private heading = 0
  private cooldown = 0
  ready = false

  get x() { return this.hull.x + this.hull.width / 2 }
  get y() { return this.hull.y + this.hull.height / 2 }
  get rotation() { return this.heading }

  setHull(x: number, y: number, width: number, height: number): void {
    this.hull.x = x - width / 2
    this.hull.y = y - height / 2
    this.hull.width = width
    this.hull.height = height
  }

  update(deltaSeconds: number, scale: number, player: PointData, physics: Physics): boolean {
    if (!this.ready) return false
    this.cooldown = Math.max(0, this.cooldown - deltaSeconds)
    const dx = player.x - this.x
    const dy = player.y - this.y
    const distance = Math.hypot(dx, dy)
    if (distance === 0) return false
    const rotation = Math.atan2(-dx, dy)
    if (physics.canPlace(this.hull, rotation, this.x, this.y)) this.heading = rotation
    const range = gameplayConfig.shooter.attackRange * scale
    if (distance > range) {
      const step = Math.min(distance - range, gameplayConfig.shooter.movementSpeed * scale * deltaSeconds)
      const x = this.x + dx / distance * step
      const y = this.y + dy / distance * step
      if (physics.canPlace(this.hull, rotation, x, y)) {
        this.setHull(x, y, this.hull.width, this.hull.height)
        this.heading = rotation
      }
    }
    if (Math.hypot(player.x - this.x, player.y - this.y) > range || this.cooldown > 0) return false
    this.cooldown = gameplayConfig.shooter.cooldownSeconds
    return true
  }
}
