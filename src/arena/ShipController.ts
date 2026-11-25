import { Sprite } from 'pixi.js'
import type { ArenaInput } from './ArenaInput'
import type { Physics } from './Physics'
import { gameplayConfig } from './gameplayConfig'

export class ShipController {
  private angle = 0

  constructor(
    private readonly ship: Sprite,
    private readonly input: ArenaInput,
    private readonly physics: Physics,
  ) {
    // The texture's bow points down; the movement heading starts facing up.
    this.ship.rotation = Math.PI
  }

  update(deltaSeconds: number): void {
    const scale = this.ship.scale.x
    const { movementSpeed, turningSpeed } = gameplayConfig.player
    let angle = this.angle
    if (this.input.isPressed('KeyA')) angle -= turningSpeed * deltaSeconds
    if (this.input.isPressed('KeyD')) angle += turningSpeed * deltaSeconds
    const distance = this.input.isPressed('KeyW') ? movementSpeed * scale * deltaSeconds : 0
    if (this.physics.move(this.physics.ship, Math.sin(angle) * distance, -Math.cos(angle) * distance, angle)) {
      this.angle = angle
    }
    this.ship.rotation = this.angle + Math.PI
    const collider = this.physics.ship
    this.ship.position.set(collider.x + collider.width / 2, collider.y + collider.height / 2)
  }
}
