import { Sprite } from 'pixi.js'
import type { ArenaInput } from './ArenaInput'

export class ShipController {
  private angle = 0

  constructor(
    private readonly ship: Sprite,
    private readonly input: ArenaInput,
  ) {}

  update(deltaSeconds: number): void {
    const scale = this.ship.scale.x
    if (this.input.isPressed('KeyA')) this.angle -= 2 * deltaSeconds
    if (this.input.isPressed('KeyD')) this.angle += 2 * deltaSeconds
    this.ship.rotation = this.angle

    if (this.input.isPressed('KeyW')) {
      this.ship.x -= Math.sin(this.angle) * 180 * scale * deltaSeconds
      this.ship.y += Math.cos(this.angle) * 180 * scale * deltaSeconds
    }
  }
}
