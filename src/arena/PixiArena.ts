import { Application, Assets, Graphics, Sprite, type Texture } from 'pixi.js'
import shipUrl from '../../assets/png/retina/ships/ship_1.png'
import chaserUrl from '../../assets/png/retina/ships/ship_2.png'
import islandUrl from '../../assets/png/retina/tiles/tile_9.png'
import { ArenaInput } from './ArenaInput'
import { findChaserSpawn } from './Chaser'
import { createSimulationRandom, readSimulationSeed } from './SimulationRandom'
import { ShipController } from './ShipController'
import { Physics } from './Physics'
import { PlayerWeapons } from './PlayerWeapons'
import { gameplayConfig } from './gameplayConfig'
import type { CollisionDebugger } from './CollisionDebugger'

const WATER_COLOR = '#147089'
const ISLAND_SIDE = 96
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
  private water?: Graphics
  private controller?: ShipController
  private island?: Sprite
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
    const [shipTexture, islandTexture, chaserTexture] = await Promise.all([
      Assets.load<Texture>(shipUrl),
      Assets.load<Texture>(islandUrl),
      Assets.load<Texture>(chaserUrl),
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

    this.water = new Graphics()
    app.stage.addChild(this.water)
    this.island = new Sprite(islandTexture)
    app.stage.addChild(this.island)
    this.ship = new Sprite(shipTexture)
    this.ship.anchor.set(0.5)
    app.stage.addChild(this.ship)
    this.chaser = new Sprite(chaserTexture)
    this.chaser.anchor.set(0.5)
    this.chaser.visible = false
    app.stage.addChild(this.chaser)
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
    this.app = undefined
    this.ship = undefined
    this.chaser = undefined
    this.water = undefined
    this.island = undefined
    this.controller = undefined
    this.projectileGraphics = undefined
    delete this.element.dataset.projectiles
    delete this.element.dataset.chaserSpawn
  }

  private readonly tick = (now: number): void => {
    if (!this.controller || !this.ship) return
    const deltaSeconds = Math.min((now - this.lastTime) / 1000, 0.05)
    this.lastTime = now
    if (this.active) {
      this.controller.update(deltaSeconds)
      const scale = this.ship.scale.x
      const radius = gameplayConfig.projectile.radius * scale
      this.weapons.advance(deltaSeconds, scale, (start, end) => this.physics.blocksProjectile(start, end, radius))
      const { ship, shipRotation } = this.physics
      for (const { code } of ArenaInput.fireCommands) {
        if (this.input.isFiring(code)) {
          this.weapons.fire(code, this.ship.position, shipRotation, ship.width / 2, ship.height / 2, scale)
        }
      }
      this.drawProjectiles()
      this.debugger?.draw(this.physics)
      this.publishPosition()
    }
    this.animationFrame = requestAnimationFrame(this.tick)
  }

  private resize(): void {
    const { app, ship, water, island, chaser } = this
    if (!app || !ship || !water || !island || !chaser) return

    const width = this.width
    const height = this.height
    const { width: previousWidth, height: previousHeight } = this.physics.bounds
    if (previousWidth > 0 && previousHeight > 0) {
      this.weapons.resize(width / previousWidth, height / previousHeight)
      if (chaser.visible) {
        chaser.position.set(chaser.x * width / previousWidth, chaser.y * height / previousHeight)
      }
    }
    app.renderer.resize(width, height, window.devicePixelRatio)
    water.clear().rect(0, 0, width, height).fill(WATER_COLOR)
    ship.position.set(width / 2, height / 2)
    ship.scale.set(Math.min(width / 960, height / 540))
    this.physics.bounds.width = width
    this.physics.bounds.height = height
    this.physics.ship.width = ship.width * SHIP_COLLIDER_WIDTH_FACTOR
    this.physics.ship.height = ship.height * SHIP_COLLIDER_HEIGHT_FACTOR
    this.physics.ship.x = ship.x - this.physics.ship.width / 2
    this.physics.ship.y = ship.y - this.physics.ship.height / 2
    const obstacle = this.physics.island
    const side = ISLAND_SIDE * ship.scale.x
    const centerX = width * 0.75
    const centerY = height / 2
    obstacle.x = centerX - side / 2
    obstacle.y = centerY - side / 2
    obstacle.width = side
    obstacle.height = side
    water.rect(obstacle.x, obstacle.y, obstacle.width, obstacle.height).fill('#dfc481')
    island.position.set(obstacle.x, obstacle.y)
    island.width = obstacle.width
    island.height = obstacle.height
    this.element.dataset.islandX = String(centerX)
    this.element.dataset.islandY = String(centerY)
    chaser.scale.set(ship.scale.x)
    if (!chaser.visible) this.spawnChaser(chaser, ship)
    this.drawProjectiles()
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
      minimumDistance: gameplayConfig.chaser.minimumSpawnDistance * ship.scale.x,
      random: this.random,
    })
    if (!spawn) return

    const x = spawn.x + spawn.width / 2
    const y = spawn.y + spawn.height / 2
    chaser.position.set(x, y)
    chaser.visible = true
    if (import.meta.env.DEV) {
      this.element.dataset.chaserSpawn = JSON.stringify({ x, y, width: spawn.width, height: spawn.height })
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
