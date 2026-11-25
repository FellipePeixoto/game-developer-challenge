import { Application, Assets, Graphics, Sprite, type Texture } from 'pixi.js'
import shipUrl from '../../assets/png/retina/ships/ship_1.png'
import type { ArenaInput } from './ArenaInput'
import { ShipController } from './ShipController'
import { Physics } from './Physics'
import type { CollisionDebugger } from './CollisionDebugger'

const WATER_COLOR = '#147089'
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
  private water?: Graphics
  private controller?: ShipController
  private island?: Graphics
  private readonly physics = new Physics()
  private debugger?: CollisionDebugger

  constructor(
    private readonly element: HTMLElement,
    private readonly input: ArenaInput,
  ) {}

  async mount(): Promise<void> {
    const texture = await Assets.load<Texture>(shipUrl)
    if (this.destroyed) return

    const app = new Application()
    this.app = app
    await app.init({
      width: this.width,
      height: this.height,
      background: WATER_COLOR,
    })

    if (this.destroyed) {
      app.destroy(true, { children: true })
      this.app = undefined
      return
    }

    this.water = new Graphics()
    app.stage.addChild(this.water)
    this.island = new Graphics()
    app.stage.addChild(this.island)
    this.ship = new Sprite(texture)
    this.ship.anchor.set(0.5)
    app.stage.addChild(this.ship)
    this.controller = new ShipController(this.ship, this.input, this.physics)

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
    this.water = undefined
    this.island = undefined
    this.controller = undefined
  }

  private readonly tick = (now: number): void => {
    if (!this.controller || !this.ship) return
    const deltaSeconds = Math.min((now - this.lastTime) / 1000, 0.05)
    this.lastTime = now
    if (this.active) {
      this.controller.update(deltaSeconds)
      this.debugger?.draw(this.physics)
      this.publishPosition()
    }
    this.animationFrame = requestAnimationFrame(this.tick)
  }

  private resize(): void {
    const { app, ship, water, island } = this
    if (!app || !ship || !water || !island) return

    const width = this.width
    const height = this.height
    app.renderer.resize(width, height)
    water.clear().rect(0, 0, width, height).fill(WATER_COLOR)
    ship.position.set(width / 2, height / 2)
    ship.scale.set(Math.min(width / 960, height / 540))
    this.physics.bounds.width = width
    this.physics.bounds.height = height
    this.physics.ship.width = ship.width * SHIP_COLLIDER_WIDTH_FACTOR
    this.physics.ship.height = ship.height * SHIP_COLLIDER_HEIGHT_FACTOR
    this.physics.ship.x = ship.x - this.physics.ship.width / 2
    this.physics.ship.y = ship.y - this.physics.ship.height / 2
    this.physics.island.x = width * 0.75
    this.physics.island.y = height / 2
    this.physics.island.radius = 48 * ship.scale.x
    const obstacle = this.physics.island
    island.clear().circle(obstacle.x, obstacle.y, obstacle.radius).fill('#dfc481')
      .circle(obstacle.x, obstacle.y, obstacle.radius * 0.8).fill('#518a3d')
    this.element.dataset.islandX = String(obstacle.x)
    this.element.dataset.islandY = String(obstacle.y)
    this.element.dataset.islandRadius = String(obstacle.radius)
    this.debugger?.draw(this.physics)
    this.publishPosition()
    this.element.dataset.shipScale = String(ship.scale.x)
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
