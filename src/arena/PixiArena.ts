import { Application, Assets, Container, Graphics, Rectangle, Sprite, Texture } from 'pixi.js'
import shipUrl from '../../assets/png/retina/ships/ship_1.png'
import chaserUrl from '../../assets/png/retina/ships/ship_2.png'
import explosionUrl from '../../assets/png/retina/effects/explosion_1.png'
import terrainUrl from '../../assets/tilesheet/tiles_sheet_retina.png'
import { arenaMap, isLandTile, mapColumns, mapLeft, mapObstacles, mapRows, oceanTile, submergedTile, tileSize } from './ArenaMap'
import { ArenaInput } from './ArenaInput'
import { EnemyFleet, type Enemy } from './EnemyFleet'
import { EnemyProjectiles } from './EnemyProjectiles'
import { createSimulationRandom, readSimulationSeed } from './SimulationRandom'
import { ShipController } from './ShipController'
import { Physics } from './Physics'
import { PlayerWeapons } from './PlayerWeapons'
import { gameplayConfig } from './gameplayConfig'
import { MatchSession, type MatchEndReason, type MatchSnapshot } from './MatchSession'
import type { CollisionDebugger } from './CollisionDebugger'

const WATER_COLOR = '#28a6c4'
// Fractions of the scaled texture dimensions: decrease for a tighter collider.
const SHIP_COLLIDER_WIDTH_FACTOR = 0.7
const SHIP_COLLIDER_HEIGHT_FACTOR = 0.7

interface EnemyView {
  layer: Container
  shipTexture: Texture
  explosionTexture: Texture
  sprites: Map<Enemy, { ship: Sprite; health: Graphics; explosion?: Sprite }>
}

export class PixiArena {
  private app?: Application
  private observer?: ResizeObserver
  private animationFrame = 0
  private destroyed = false
  private active = false
  private lastTime = 0
  private ship?: Sprite
  private playerHealthBar?: Graphics
  private fleet?: EnemyFleet
  private enemyView?: EnemyView
  private readonly enemyWeapons = new EnemyProjectiles()
  private readonly match: MatchSession
  private lastPublishedMatch = ''
  private terrain?: Container
  private readonly tileTextures = new Map<number, Texture>()
  private controller?: ShipController
  private projectileGraphics?: Graphics
  private readonly physics = new Physics()
  private readonly random = createSimulationRandom(
    import.meta.env.DEV ? readSimulationSeed(window.location.search) : undefined,
  )
  private readonly weapons = new PlayerWeapons()
  private debugger?: CollisionDebugger

  constructor(
    private readonly element: HTMLElement,
    private readonly input: ArenaInput,
    private readonly spawnIntervalSeconds: number,
    durationSeconds: number,
    private readonly onEnd: (reason: MatchEndReason) => void,
    private readonly onMatchChange: (match: MatchSnapshot) => void,
  ) {
    this.match = new MatchSession(durationSeconds)
  }

  async mount(): Promise<void> {
    const [shipTexture, enemyTexture, explosionTexture, tiles] = await Promise.all([
      Assets.load<Texture>(shipUrl),
      Assets.load<Texture>(chaserUrl),
      Assets.load<Texture>(explosionUrl),
      Assets.load<Texture>(terrainUrl),
    ])
    if (this.destroyed) return

    const app = new Application()
    this.app = app
    await app.init({
      width: this.width,
      height: this.height,
      resolution: window.devicePixelRatio,
      background: WATER_COLOR,
    })

    if (this.destroyed) {
      app.destroy(true, { children: true })
      this.app = undefined
      return
    }

    this.terrain = this.createTerrain(tiles)
    app.stage.addChild(this.terrain)
    this.ship = new Sprite(shipTexture)
    this.ship.anchor.set(0.5)
    app.stage.addChild(this.ship)
    this.playerHealthBar = new Graphics()
    app.stage.addChild(this.playerHealthBar)
    const scenario = import.meta.env.DEV ? new URLSearchParams(window.location.search).get('enemy') : null
    this.fleet = new EnemyFleet(this.spawnIntervalSeconds, this.random, enemyTexture.width, enemyTexture.height,
      scenario === 'chaser' || scenario === 'shooter' ? scenario : undefined)
    this.enemyView = { layer: new Container(), shipTexture: enemyTexture, explosionTexture, sprites: new Map() }
    app.stage.addChild(this.enemyView.layer)
    this.controller = new ShipController(this.ship, this.input, this.physics)
    this.projectileGraphics = new Graphics()
    app.stage.addChild(this.projectileGraphics)

    if (import.meta.env.DEV) {
      const { CollisionDebugger } = await import('./CollisionDebugger')
      if (this.destroyed) return
      this.debugger = new CollisionDebugger(app.stage, this.element)
    }

    this.resize()
    this.observer = new ResizeObserver(() => this.resize())
    this.observer.observe(this.element)
    this.element.appendChild(app.canvas)
    this.publishMatch()
    this.lastTime = performance.now()
    this.animationFrame = requestAnimationFrame(this.tick)
  }

  setActive(active: boolean): void {
    this.active = active
    if (active && !this.match.endReason) this.input.start()
    else this.input.stop()
  }

  destroy(): void {
    this.destroyed = true
    this.observer?.disconnect()
    cancelAnimationFrame(this.animationFrame)
    this.input.stop()
    this.debugger?.destroy()
    this.debugger = undefined
    if (this.app?.renderer) this.app.destroy(true, { children: true })
    for (const texture of this.tileTextures.values()) texture.destroy()
    this.tileTextures.clear()
    this.app = undefined
    this.ship = undefined
    this.playerHealthBar = undefined
    this.fleet = undefined
    this.enemyView = undefined
    this.terrain = undefined
    this.controller = undefined
    this.projectileGraphics = undefined
    delete this.element.dataset.projectiles
    delete this.element.dataset.enemies
    delete this.element.dataset.score
    delete this.element.dataset.playerHealth
    delete this.element.dataset.remainingSeconds
    delete this.element.dataset.chaserSpawn
    delete this.element.dataset.chaserState
    delete this.element.dataset.shooterState
  }

  private readonly tick = (now: number): void => {
    if (!this.controller || !this.ship || !this.fleet) return
    const deltaSeconds = Math.min((now - this.lastTime) / 1000, 0.05)
    this.lastTime = now
    if (this.active) {
      this.match.advance(deltaSeconds)
      this.publishMatch()
      if (this.match.endReason) {
        this.finishMatch()
        return
      }
      this.controller.update(deltaSeconds)
      const scale = this.ship.scale.x
      const impactDamage = this.fleet.update(deltaSeconds, scale, this.ship.position, this.physics, this.enemyWeapons)
      const enemyDamage = this.enemyWeapons.advance(deltaSeconds, scale, this.physics)
      this.match.damage(impactDamage + enemyDamage)
      if (this.match.endReason) {
        this.drawPlayerHealth()
        this.drawEnemies()
        this.publishPosition()
        this.publishMatch()
        this.finishMatch()
        return
      }
      const radius = gameplayConfig.projectile.radius * scale
      this.weapons.advance(deltaSeconds, scale, (start, end) => {
        if (this.physics.blocksProjectile(start, end, radius)) return true
        const result = this.fleet!.hitProjectile(start, end, radius, scale, this.physics)
        if (result === 'kill') this.match.awardKill()
        return result !== 'miss'
      })
      const { ship, shipRotation } = this.physics
      for (const { code } of ArenaInput.fireCommands) {
        if (this.input.isFiring(code)) {
          this.weapons.fire(code, this.ship.position, shipRotation, ship.width / 2, ship.height / 2, scale)
        }
      }
      this.drawProjectiles()
      this.drawPlayerHealth()
      this.drawEnemies()
      this.debugger?.draw(this.physics)
      this.publishPosition()
      this.publishMatch()
    }
    this.animationFrame = requestAnimationFrame(this.tick)
  }

  private publishMatch(): void {
    this.element.dataset.remainingSeconds = String(this.match.remainingSeconds)
    this.element.dataset.playerHealth = String(this.match.health)
    this.element.dataset.score = String(this.match.score)
    const snapshot = this.match.snapshot()
    const key = `${snapshot.score}:${snapshot.remainingSeconds}:${snapshot.health}`
    if (key !== this.lastPublishedMatch) {
      this.lastPublishedMatch = key
      this.onMatchChange(snapshot)
    }
  }

  private finishMatch(): void {
    if (!this.match.endReason) return
    this.setActive(false)
    this.onEnd(this.match.endReason)
    this.animationFrame = requestAnimationFrame(this.tick)
  }

  private createTerrain(sheet: Texture): Container {
    const terrain = new Container()
    const water = new Container()
    const land = new Container()
    const atlasTileSize = sheet.width / 16
    const place = (layer: Container, id: number, x: number, y: number) => {
      let texture = this.tileTextures.get(id)
      if (!texture) {
        const column = (id - 1) % 16
        const row = Math.floor((id - 1) / 16)
        const frame = new Rectangle(column * atlasTileSize, row * atlasTileSize, atlasTileSize, atlasTileSize)
        texture = new Texture({ source: sheet.source, frame })
        this.tileTextures.set(id, texture)
      }
      const sprite = new Sprite(texture)
      sprite.position.set(x, y)
      sprite.setSize(tileSize, tileSize)
      layer.addChild(sprite)
    }
    for (const [row, cells] of arenaMap.entries()) {
      for (const [column, tile] of cells.entries()) {
        const x = mapLeft + column * tileSize
        const y = row * tileSize
        place(water, oceanTile, x, y)
        if (!tile) continue
        const isLand = isLandTile(tile)
        place(water, isLand ? submergedTile : tile, x, y)
        if (isLand) place(land, tile, x, y)
      }
    }
    terrain.addChild(water, land)
    terrain.tint = 0xe4e4e4
    terrain.cacheAsTexture({ resolution: 100 })
    return terrain
  }

  private resize(): void {
    const { app, ship, terrain, fleet } = this
    if (!app || !ship || !terrain || !fleet) return

    const width = this.width
    const height = this.height
    const { width: previousWidth, height: previousHeight } = this.physics.bounds
    app.renderer.resize(width, height, window.devicePixelRatio)
    terrain.scale.set(width / mapColumns, height / mapRows)
    ship.position.set(width / 2, height / 2)
    ship.scale.set(Math.min(width / 960, height / 540))
    if (previousWidth > 0 && previousHeight > 0) {
      const xRatio = width / previousWidth
      const yRatio = height / previousHeight
      this.weapons.resize(xRatio, yRatio)
      this.enemyWeapons.resize(xRatio, yRatio)
      fleet.resize(xRatio, yRatio, ship.scale.x)
    }
    this.physics.bounds.width = width
    this.physics.bounds.height = height
    this.physics.ship.width = ship.width * SHIP_COLLIDER_WIDTH_FACTOR
    this.physics.ship.height = ship.height * SHIP_COLLIDER_HEIGHT_FACTOR
    this.physics.ship.x = ship.x - this.physics.ship.width / 2
    this.physics.ship.y = ship.y - this.physics.ship.height / 2
    const { obstacles } = this.physics
    obstacles.splice(0, obstacles.length, ...mapObstacles(width, height))
    if (import.meta.env.DEV) {
      const spawn = fleet.spawnScenario(this.physics, ship.position, ship.scale.x)
      if (spawn && fleet.scenario === 'chaser') {
        const { x, y, width, height } = spawn
        this.element.dataset.chaserSpawn = JSON.stringify({ x: x + width / 2, y: y + height / 2, width, height })
      }
    }
    this.drawProjectiles()
    this.drawPlayerHealth()
    this.drawEnemies()
    this.debugger?.draw(this.physics)
    this.publishPosition()
    this.element.dataset.shipScale = String(ship.scale.x)
  }

  private drawPlayerHealth(): void {
    const { ship, playerHealthBar: bar } = this
    if (!ship || !bar) return
    const width = ship.width * 0.7
    const height = Math.max(4, 5 * ship.scale.x)
    bar.clear()
    bar.rect(0, 0, width, height).fill('#9f302b')
    bar.rect(0, 0, width * this.match.health / gameplayConfig.player.maxHealth, height).fill('#63c766')
    bar.rect(0, 0, width, height).stroke({ color: '#18212c', width: Math.max(1, ship.scale.x) })
    bar.position.set(ship.x - width / 2, ship.y - ship.height / 2 - 12 * ship.scale.x)
  }

  private drawEnemies(): void {
    const { fleet, enemyView, ship: player } = this
    if (!fleet || !enemyView || !player) return
    const { layer, sprites, shipTexture, explosionTexture } = enemyView
    for (const [enemy, visual] of sprites) {
      if (fleet.enemies.has(enemy)) continue
      visual.ship.destroy()
      visual.health.destroy()
      visual.explosion?.destroy()
      sprites.delete(enemy)
    }

    for (const enemy of fleet.enemies) {
      let visual = sprites.get(enemy)
      if (!visual) {
        const ship = new Sprite(shipTexture)
        ship.anchor.set(0.5)
        if (enemy.type === 'shooter') ship.tint = 0xffb85c
        const health = new Graphics()
        layer.addChild(ship, health)
        visual = { ship, health }
        if (enemy.type === 'chaser') {
          const explosion = new Sprite(explosionTexture)
          explosion.anchor.set(0.5)
          layer.addChild(explosion)
          visual.explosion = explosion
        }
        sprites.set(enemy, visual)
      }

      const { x, y, rotation } = enemy.ship
      visual.ship.position.set(x, y)
      visual.ship.rotation = rotation
      visual.ship.scale.set(player.scale.x)
      const maxHealth = gameplayConfig[enemy.type].maxHealth
      const barWidth = 38 * player.scale.x
      const barHeight = 5 * player.scale.x
      visual.health.clear()
      visual.health.rect(0, 0, barWidth, barHeight).fill('#9f302b')
      visual.health.rect(0, 0, barWidth * enemy.health / maxHealth, barHeight).fill('#63c766')
      visual.health.rect(0, 0, barWidth, barHeight).stroke({ color: '#18212c', width: Math.max(1, player.scale.x) })
      visual.health.position.set(x - barWidth / 2, y - shipTexture.height * player.scale.x / 2 - 12 * player.scale.x)
      visual.health.visible = enemy.type === 'shooter' || enemy.ship.phase === 'pursuing'
      if (enemy.type === 'chaser' && visual.explosion) {
        visual.ship.visible = enemy.ship.phase === 'pursuing'
        visual.explosion.visible = enemy.ship.phase === 'exploding'
        visual.explosion.position.set(x, y)
        visual.explosion.scale.set(player.scale.x)
        visual.explosion.alpha = enemy.ship.explosionOpacity
      }
    }
    if (import.meta.env.DEV) this.publishEnemyState(fleet)
  }

  private publishEnemyState(fleet: EnemyFleet): void {
    this.element.dataset.score = String(this.match.score)
    this.element.dataset.enemies = JSON.stringify(Array.from(fleet.enemies, ({ type, health }) => ({ type, health })))
    if (!fleet.scenario) {
      return
    }
    const enemy = fleet.enemies.values().next().value
    if (!enemy) return
    const { x, y, rotation } = enemy.ship
    if (enemy.type === 'shooter') {
      this.element.dataset.shooterState = JSON.stringify({
        x, y, rotation, health: enemy.health, score: this.match.score,
        playerHealth: this.match.health,
        projectiles: this.enemyWeapons.projectiles.map(({ id, x, y }) => ({ id, x, y })),
      })
    } else {
      this.element.dataset.chaserState = JSON.stringify({
        phase: enemy.ship.phase, x, y, rotation, health: enemy.health,
        playerHealth: this.match.health, score: this.match.score,
      })
    }
  }

  private drawProjectiles(): void {
    const graphics = this.projectileGraphics
    if (!graphics || !this.ship) return
    const radius = gameplayConfig.projectile.radius * this.ship.scale.x
    graphics.clear()
    const positions = this.weapons.projectiles.map(({ id, x, y }) => {
      graphics.circle(x, y, radius).fill('#18212c')
      return { id, x, y }
    })
    this.element.dataset.projectiles = JSON.stringify(positions)
    const enemyRadius = gameplayConfig.shooter.projectileRadius * this.ship.scale.x
    for (const shot of this.enemyWeapons.projectiles) {
      graphics.circle(shot.x, shot.y, enemyRadius).fill('#be392b')
    }
  }

  private publishPosition(): void {
    if (!this.ship) return
    this.element.dataset.shipX = String(this.ship.x)
    this.element.dataset.shipY = String(this.ship.y)
    this.element.dataset.shipCorners = JSON.stringify(this.physics.shipCorners())
  }

  private get width(): number {
    return Math.max(1, this.element.clientWidth)
  }

  private get height(): number {
    return Math.max(1, this.element.clientHeight)
  }
}
