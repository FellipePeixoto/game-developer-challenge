import { Rectangle, type PointData } from 'pixi.js'
import { Chaser } from './Chaser'
import type { EnemyProjectiles } from './EnemyProjectiles'
import { gameplayConfig } from './gameplayConfig'
import type { Physics } from './Physics'
import { Shooter } from './Shooter'

type EnemyType = 'chaser' | 'shooter'
export type Enemy = { type: 'chaser'; ship: Chaser } | { type: 'shooter'; ship: Shooter }

const ENEMY_COLLIDER_SCALE = 0.7

export class EnemyFleet {
  private readonly ships = new Set<Enemy>()
  private elapsed = 0

  constructor(
    private readonly interval: number,
    private readonly random: () => number,
    private readonly textureWidth: number,
    private readonly textureHeight: number,
    readonly scenario?: EnemyType,
  ) {}

  get enemies(): ReadonlySet<Enemy> { return this.ships }

  spawnScenario(physics: Physics, player: PointData, scale: number): Rectangle | undefined {
    if (this.scenario && this.ships.size === 0) {
      return this.spawn(this.scenario, physics, player, scale)
    }
  }

  update(delta: number, scale: number, player: PointData, physics: Physics, weapons: EnemyProjectiles): number {
    let damage = 0
    for (const enemy of this.ships) {
      if (enemy.type === 'chaser') {
        if (enemy.ship.update(delta, scale, player, physics)) damage += gameplayConfig.chaser.impactDamage
        if (enemy.ship.phase === 'removed' && !this.scenario) this.ships.delete(enemy)
      } else if (enemy.ship.update(delta, scale, player, physics)) {
        weapons.fire(enemy.ship, player)
      }
    }

    if (!this.scenario) {
      this.elapsed += delta
      if (this.elapsed >= this.interval) {
        this.elapsed -= this.interval
        const type = this.random() < gameplayConfig.enemySpawn.chaserChance ? 'chaser' : 'shooter'
        this.spawn(type, physics, player, scale)
      }
    }
    return damage
  }

  resize(xRatio: number, yRatio: number, scale: number): void {
    const width = this.textureWidth * scale * ENEMY_COLLIDER_SCALE
    const height = this.textureHeight * scale * ENEMY_COLLIDER_SCALE
    for (const { ship } of this.ships) {
      ship.setHull(ship.x * xRatio, ship.y * yRatio, width, height)
    }
  }

  private spawn(type: EnemyType, physics: Physics, player: PointData, scale: number): Rectangle | undefined {
    const width = this.textureWidth * scale
    const height = this.textureHeight * scale
    const spawn = findEnemySpawn(physics, player, width, height,
      gameplayConfig[type].minimumSpawnDistance * scale, this.random)
    if (!spawn) return

    const enemy: Enemy = type === 'chaser' ? { type, ship: new Chaser() } : { type, ship: new Shooter() }
    enemy.ship.setHull(spawn.x + width / 2, spawn.y + height / 2,
      width * ENEMY_COLLIDER_SCALE, height * ENEMY_COLLIDER_SCALE)
    if (enemy.type === 'chaser') enemy.ship.startPursuit()
    else enemy.ship.ready = true
    this.ships.add(enemy)
    return spawn
  }
}

function findEnemySpawn(
  { bounds, obstacles }: Physics,
  player: PointData,
  width: number,
  height: number,
  minimumDistance: number,
  random: () => number,
): Rectangle | undefined {
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
}
