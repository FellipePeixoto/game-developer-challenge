import { Graphics, type Container } from 'pixi.js'
import type { Physics } from './Physics'

export class CollisionDebugger {
  private readonly graphics = new Graphics()

  constructor(stage: Container, private readonly element: HTMLElement) {
    stage.addChild(this.graphics)
    element.dataset.collisionDebugger = 'enabled'
  }

  draw(physics: Physics): void {
    const { bounds, ship, obstacles } = physics
    this.graphics.clear()
      .rect(bounds.x + 1, bounds.y + 1, Math.max(0, bounds.width - 2), Math.max(0, bounds.height - 2))
      .stroke({ color: 0xffff00, width: 2 })
    for (const obstacle of obstacles) {
      this.graphics.circle(obstacle.x, obstacle.y, obstacle.radius)
        .stroke({ color: 0xff00ff, width: 2 })
    }
    this.graphics.poly(physics.shipCorners(), true).stroke({ color: 0x00ffff, width: 2 })
    this.element.dataset.debugColliders = JSON.stringify({
      bounds: [bounds.x, bounds.y, bounds.width, bounds.height],
      ship: [ship.x, ship.y, ship.width, ship.height, physics.shipRotation],
      obstacles: obstacles.map(obstacle => [obstacle.x, obstacle.y, obstacle.radius]),
    })
  }

  destroy(): void {
    this.graphics.destroy()
    delete this.element.dataset.collisionDebugger
    delete this.element.dataset.debugColliders
  }
}
