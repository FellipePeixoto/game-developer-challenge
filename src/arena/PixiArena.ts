import { Application, Assets, Graphics, Sprite, type Texture } from 'pixi.js'
import shipUrl from '../../assets/png/retina/ships/ship_1.png'
import type { ArenaInput } from './ArenaInput'
import { ShipController } from './ShipController'

const WATER_COLOR = '#147089'

export class PixiArena {
  private app?: Application
  private observer?: ResizeObserver
  private animationFrame = 0
  private destroyed = false
  private lastTime = 0
  private ship?: Sprite
  private water?: Graphics
  private controller?: ShipController

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
    this.ship = new Sprite(texture)
    this.ship.anchor.set(0.5)
    app.stage.addChild(this.ship)
    this.controller = new ShipController(this.ship, this.input)

    this.resize()
    this.observer = new ResizeObserver(() => this.resize())
    this.observer.observe(this.element)
    this.element.appendChild(app.canvas)
    this.input.start()
    this.lastTime = performance.now()
    this.animationFrame = requestAnimationFrame(this.tick)
  }

  destroy(): void {
    this.destroyed = true
    this.observer?.disconnect()
    cancelAnimationFrame(this.animationFrame)
    this.input.stop()
    if (this.app?.renderer) this.app.destroy(true, { children: true })
    this.app = undefined
    this.ship = undefined
    this.water = undefined
    this.controller = undefined
  }

  private readonly tick = (now: number): void => {
    if (!this.controller || !this.ship) return
    const deltaSeconds = Math.min((now - this.lastTime) / 1000, 0.05)
    this.lastTime = now
    this.controller.update(deltaSeconds)
    this.publishPosition()
    this.animationFrame = requestAnimationFrame(this.tick)
  }

  private resize(): void {
    const { app, ship, water } = this
    if (!app || !ship || !water) return

    const width = this.width
    const height = this.height
    app.renderer.resize(width, height)
    water.clear().rect(0, 0, width, height).fill(WATER_COLOR)
    ship.position.set(width / 2, height / 2)
    ship.scale.set(Math.min(width / 960, height / 540))
    this.publishPosition()
    this.element.dataset.shipScale = String(ship.scale.x)
  }

  private publishPosition(): void {
    if (!this.ship) return
    this.element.dataset.shipX = String(this.ship.x)
    this.element.dataset.shipY = String(this.ship.y)
  }

  private get width(): number {
    return Math.max(1, this.element.clientWidth)
  }

  private get height(): number {
    return Math.max(1, this.element.clientHeight)
  }
}
