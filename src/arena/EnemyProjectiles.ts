import type { PointData } from 'pixi.js'
import { gameplayConfig } from './gameplayConfig'
import type { Physics } from './Physics'

interface Projectile {
  id: number
  x: number
  y: number
  directionX: number
  directionY: number
  age: number
}

export class EnemyProjectiles {
  private shots: Projectile[] = []
  private nextId = 0

  get projectiles(): ReadonlyArray<Readonly<Projectile>> { return this.shots }

  fire(origin: PointData, target: PointData): void {
    const dx = target.x - origin.x
    const dy = target.y - origin.y
    const distance = Math.hypot(dx, dy)
    if (distance === 0) return
    this.shots.push({ id: this.nextId++, x: origin.x, y: origin.y,
      directionX: dx / distance, directionY: dy / distance, age: 0 })
  }

  advance(deltaSeconds: number, scale: number, physics: Physics): number {
    const config = gameplayConfig.shooter
    const radius = config.projectileRadius * scale
    let damage = 0
    this.shots = this.shots.filter(shot => {
      const start = { x: shot.x, y: shot.y }
      const travelSeconds = Math.min(deltaSeconds, config.projectileLifetimeSeconds - shot.age)
      const step = config.projectileSpeed * scale * travelSeconds
      shot.x += shot.directionX * step
      shot.y += shot.directionY * step
      shot.age += deltaSeconds
      const hit = physics.projectileShipContact(start, shot, radius)
      // Check only as far as the first ship contact so land behind the ship cannot absorb the hit.
      const end = hit === undefined ? shot : {
        x: start.x + (shot.x - start.x) * hit,
        y: start.y + (shot.y - start.y) * hit,
      }
      if (physics.blocksProjectile(start, end, radius)) return false
      if (hit !== undefined) {
        damage += config.projectileDamage
        return false
      }
      return shot.age < config.projectileLifetimeSeconds
    })
    return damage
  }

  resize(scaleX: number, scaleY: number): void {
    for (const shot of this.shots) {
      shot.x *= scaleX
      shot.y *= scaleY
    }
  }
}
