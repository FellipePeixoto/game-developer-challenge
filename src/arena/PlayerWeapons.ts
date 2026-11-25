import { gameplayConfig, type FireCommand } from './gameplayConfig'

type Position = { x: number; y: number }
type Projectile = Position & {
  id: number
  direction: Position
  remainingSeconds: number
}

export class PlayerWeapons {
  private shots: Projectile[] = []
  private elapsedSeconds = 0
  private nextId = 0
  private readonly readyAt: Record<FireCommand, number> = { Space: 0, KeyQ: 0, KeyE: 0 }

  get projectiles(): ReadonlyArray<Readonly<Projectile>> {
    return this.shots
  }

  advance(deltaSeconds: number, scale: number, isBlocked: (start: Position, end: Position) => boolean): void {
    this.elapsedSeconds += deltaSeconds
    const travel = gameplayConfig.projectile.speed * scale * deltaSeconds
    this.shots = this.shots.filter(shot => {
      shot.remainingSeconds -= deltaSeconds
      if (shot.remainingSeconds <= 0) return false
      const next = { x: shot.x + shot.direction.x * travel, y: shot.y + shot.direction.y * travel }
      if (isBlocked(shot, next)) return false
      shot.x = next.x
      shot.y = next.y
      return true
    })
  }

  fire(command: FireCommand, center: Position, heading: number, halfWidth: number, halfLength: number, scale: number): void {
    if (this.elapsedSeconds < this.readyAt[command]) return
    this.readyAt[command] = this.elapsedSeconds + gameplayConfig.weapons[command].cooldownSeconds
    const forward = { x: Math.sin(heading), y: -Math.cos(heading) }
    const right = { x: Math.cos(heading), y: Math.sin(heading) }
    if (command === 'Space') {
      this.spawn(center, forward, halfLength)
      return
    }

    const side = command === 'KeyQ' ? -1 : 1
    const direction = { x: right.x * side, y: right.y * side }
    const spacing = Math.min(gameplayConfig.projectile.broadsideSpacing * scale, halfLength)
    for (const offset of [-spacing, 0, spacing]) {
      this.spawn({ x: center.x + forward.x * offset, y: center.y + forward.y * offset }, direction, halfWidth)
    }
  }

  resize(scaleX: number, scaleY: number): void {
    for (const shot of this.shots) {
      shot.x *= scaleX
      shot.y *= scaleY
    }
  }

  private spawn(origin: Position, direction: Position, muzzleDistance: number): void {
    this.shots.push({
      id: this.nextId++,
      x: origin.x + direction.x * muzzleDistance,
      y: origin.y + direction.y * muzzleDistance,
      direction,
      remainingSeconds: gameplayConfig.projectile.lifetimeSeconds,
    })
  }
}
