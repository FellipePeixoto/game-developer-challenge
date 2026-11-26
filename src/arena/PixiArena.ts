import { Application, Assets, Container, Graphics, Rectangle, Sprite, Texture } from 'pixi.js'
import shipUrl from '../../assets/png/retina/ships/ship_1.png'
import chaserUrl from '../../assets/png/retina/ships/ship_2.png'
import explosionUrl from '../../assets/png/retina/effects/explosion_1.png'
import terrainUrl from '../../assets/tilesheet/tiles_sheet_retina.png'
import { arenaMap, isLandTile, mapColumns, mapLeft, mapObstacles, mapRows, oceanTile, submergedTile, tileSize } from './ArenaMap'
import { ArenaInput } from './ArenaInput'
import { Chaser, findChaserSpawn } from './Chaser'
import { Shooter } from './Shooter'
import { EnemyProjectiles } from './EnemyProjectiles'
import { createSimulationRandom, readSimulationSeed } from './SimulationRandom'
import { ShipController } from './ShipController'
import { Physics } from './Physics'
import { PlayerWeapons } from './PlayerWeapons'
import { gameplayConfig } from './gameplayConfig'
import type { CollisionDebugger } from './CollisionDebugger'

const WATER_COLOR = '#28a6c4'
// Fractions of the scaled texture dimensions: decrease for a tighter collider.
const SHIP_COLLIDER_WIDTH_FACTOR = 0.7
const SHIP_COLLIDER_HEIGHT_FACTOR = 0.7

export class PixiArena {
  private app?: Application
  private observer?: ResizeObserver
  private animationFrame = 0
  private destroyed = false
  private active = false
  private lastTime = 0
  private ship?: Sprite
  private chaser?: Sprite
  private explosion?: Sprite
  private readonly chaserSimulation = new Chaser()
  private readonly shooterSimulation = new Shooter()
  private readonly enemyWeapons = new EnemyProjectiles()
  private readonly shooterScenario = import.meta.env.DEV
    && new URLSearchParams(window.location.search).get('enemy') === 'shooter'
  private playerHealth: number = gameplayConfig.player.maxHealth
  private readonly score = 0
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
  ) {}

  async mount(): Promise<void> {
    const [shipTexture, chaserTexture, explosionTexture, tiles] = await Promise.all([
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
    this.chaser = new Sprite(chaserTexture)
    this.chaser.anchor.set(0.5)
    this.chaser.visible = false
    app.stage.addChild(this.chaser)
    this.explosion = new Sprite(explosionTexture)
    this.explosion.anchor.set(0.5)
    this.explosion.visible = false
    app.stage.addChild(this.explosion)
    this.controller = new ShipController(this.ship, this.input, this.physics)
    this.projectileGraphics = new Graphics()
    app.stage.addChild(this.projectileGraphics)

    if (import.meta.env.DEV) {
      const { CollisionDebugger } = await import('./CollisionDebugger')
      if (this.destroyed) return
      // this.debugger = new CollisionDebugger(app.stage, this.element)
    }

    this.resize()
    this.observer = new ResizeObserver(() => this.resize())
    this.observer.observe(this.element)
    this.element.appendChild(app.canvas)
    this.lastTime = performance.now()
    this.animationFrame = requestAnimationFrame(this.tick)
  }

  setActive(active: boolean): void {
    this.active = active
    if (active) this.input.start()
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
    this.chaser = undefined
    this.explosion = undefined
    this.terrain = undefined
    this.controller = undefined
    this.projectileGraphics = undefined
    delete this.element.dataset.projectiles
    delete this.element.dataset.chaserSpawn
    delete this.element.dataset.chaserState
    delete this.element.dataset.shooterState
  }

  private readonly tick = (now: number): void => {
    if (!this.controller || !this.ship) return
    const deltaSeconds = Math.min((now - this.lastTime) / 1000, 0.05)
    this.lastTime = now
    if (this.active) {
      this.controller.update(deltaSeconds)
      const scale = this.ship.scale.x
      if (this.chaserSimulation.update(deltaSeconds, scale, this.ship.position, this.physics)) {
        this.playerHealth = Math.max(0, this.playerHealth - gameplayConfig.chaser.impactDamage)
      }
      if (this.shooterSimulation.update(deltaSeconds, scale, this.ship.position, this.physics)) {
        this.enemyWeapons.fire(this.shooterSimulation, this.ship.position)
      }
      const enemyDamage = this.enemyWeapons.advance(deltaSeconds, scale, this.physics)
      this.playerHealth = Math.max(0, this.playerHealth - enemyDamage)
      const radius = gameplayConfig.projectile.radius * scale
      this.weapons.advance(deltaSeconds, scale, (start, end) => this.physics.blocksProjectile(start, end, radius))
      const { ship, shipRotation } = this.physics
      for (const { code } of ArenaInput.fireCommands) {
        if (this.input.isFiring(code)) {
          this.weapons.fire(code, this.ship.position, shipRotation, ship.width / 2, ship.height / 2, scale)
        }
      }
      this.drawProjectiles()
      this.drawChaser()
      this.debugger?.draw(this.physics)
      this.publishPosition()
    }
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
    const { app, ship, terrain, chaser, explosion, chaserSimulation } = this
    if (!app || !ship || !terrain || !chaser || !explosion) return

    const width = this.width
    const height = this.height
    const { width: previousWidth, height: previousHeight } = this.physics.bounds
    if (previousWidth > 0 && previousHeight > 0) {
      this.weapons.resize(width / previousWidth, height / previousHeight)
      this.enemyWeapons.resize(width / previousWidth, height / previousHeight)
    }
    app.renderer.resize(width, height, window.devicePixelRatio)
    terrain.scale.set(width / mapColumns, height / mapRows)
    ship.position.set(width / 2, height / 2)
    ship.scale.set(Math.min(width / 960, height / 540))
    this.physics.bounds.width = width
    this.physics.bounds.height = height
    this.physics.ship.width = ship.width * SHIP_COLLIDER_WIDTH_FACTOR
    this.physics.ship.height = ship.height * SHIP_COLLIDER_HEIGHT_FACTOR
    this.physics.ship.x = ship.x - this.physics.ship.width / 2
    this.physics.ship.y = ship.y - this.physics.ship.height / 2
    const { obstacles } = this.physics
    obstacles.splice(0, obstacles.length, ...mapObstacles(width, height))
    chaser.scale.set(ship.scale.x)
    explosion.scale.set(ship.scale.x)
    if (this.shooterScenario && this.shooterSimulation.ready) {
      const shooter = this.shooterSimulation
      shooter.setHull(shooter.x * width / previousWidth, shooter.y * height / previousHeight,
        chaser.width * SHIP_COLLIDER_WIDTH_FACTOR, chaser.height * SHIP_COLLIDER_HEIGHT_FACTOR)
    } else if (chaserSimulation.phase === 'waiting') {
      this.spawnChaser(chaser, ship)
    } else {
      chaserSimulation.setHull(
        chaserSimulation.x * width / previousWidth,
        chaserSimulation.y * height / previousHeight,
        chaser.width * SHIP_COLLIDER_WIDTH_FACTOR,
        chaser.height * SHIP_COLLIDER_HEIGHT_FACTOR,
      )
    }
    this.drawProjectiles()
    this.drawChaser()
    this.debugger?.draw(this.physics)
    this.publishPosition()
    this.element.dataset.shipScale = String(ship.scale.x)
  }

  private spawnChaser(chaser: Sprite, ship: Sprite): void {
    const { bounds, obstacles } = this.physics
    const spawn = findChaserSpawn({
      bounds,
      obstacles,
      player: ship.position,
      width: chaser.width,
      height: chaser.height,
      minimumDistance: (this.shooterScenario ? gameplayConfig.shooter : gameplayConfig.chaser).minimumSpawnDistance * ship.scale.x,
      random: this.random,
    })
    if (!spawn) return

    const x = spawn.x + spawn.width / 2
    const y = spawn.y + spawn.height / 2
    if (this.shooterScenario) {
      this.shooterSimulation.setHull(x, y, spawn.width * SHIP_COLLIDER_WIDTH_FACTOR, spawn.height * SHIP_COLLIDER_HEIGHT_FACTOR)
      this.shooterSimulation.ready = true
      chaser.tint = 0xffb85c
      return
    }
    this.chaserSimulation.setHull(x, y, spawn.width * SHIP_COLLIDER_WIDTH_FACTOR, spawn.height * SHIP_COLLIDER_HEIGHT_FACTOR)
    this.chaserSimulation.startPursuit()
    if (import.meta.env.DEV) {
      this.element.dataset.chaserSpawn = JSON.stringify({ x, y, width: spawn.width, height: spawn.height })
    }
  }

  private drawChaser(): void {
    const { chaser, explosion, chaserSimulation } = this
    if (!chaser || !explosion) return
    if (this.shooterScenario) {
      const shooter = this.shooterSimulation
      chaser.visible = shooter.ready
      chaser.position.set(shooter.x, shooter.y)
      chaser.rotation = shooter.rotation
      this.element.dataset.shooterState = JSON.stringify({
        x: shooter.x, y: shooter.y, rotation: shooter.rotation,
        playerHealth: this.playerHealth,
        projectiles: this.enemyWeapons.projectiles.map(({ id, x, y }) => ({ id, x, y })),
      })
      return
    }
    const { phase, x, y, rotation, explosionOpacity } = chaserSimulation
    chaser.visible = phase === 'pursuing'
    chaser.position.set(x, y)
    chaser.rotation = rotation
    explosion.visible = phase === 'exploding'
    explosion.position.set(x, y)
    explosion.alpha = explosionOpacity
    if (import.meta.env.DEV) {
      this.element.dataset.chaserState = JSON.stringify({
        phase, x, y, rotation, playerHealth: this.playerHealth, score: this.score,
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
