import { useEffect, useRef, useState } from 'react'
import { Application, Assets, Graphics, Sprite } from 'pixi.js'
import shipUrl from '../assets/png/retina/ships/ship_1.png'

type LoadState = 'loading' | 'error' | 'ready'

export function BattleArena() {
  const host = useRef<HTMLDivElement>(null)
  const [attempt, setAttempt] = useState(0)
  const [loadState, setLoadState] = useState<LoadState>('loading')

  useEffect(() => {
    const container = host.current
    if (!container) return
    const element = container
    let disposed = false
    let app: Application | undefined
    let observer: ResizeObserver | undefined

    async function mount() {
      try {
        const texture = await Assets.load(shipUrl)
        if (disposed) return
        const next = new Application()
        app = next
        await next.init({ width: Math.max(1, element.clientWidth), height: Math.max(1, element.clientHeight), background: '#147089' })
        if (disposed) {
          next.destroy(true, { children: true })
          app = undefined
          return
        }
        const water = new Graphics()
        next.stage.addChild(water)
        const ship = new Sprite(texture)
        ship.anchor.set(0.5)
        next.stage.addChild(ship)
        const resize = () => {
          const width = Math.max(1, element.clientWidth)
          const height = Math.max(1, element.clientHeight)
          next.renderer.resize(width, height)
          water.clear().rect(0, 0, width, height).fill('#147089')
          ship.position.set(width / 2, height / 2)
          ship.scale.set(Math.min(width / 960, height / 540))
          element.dataset.shipX = String(ship.x)
          element.dataset.shipY = String(ship.y)
          element.dataset.shipScale = String(ship.scale.x)
        }
        resize()
        observer = new ResizeObserver(resize)
        observer.observe(element)
        element.appendChild(next.canvas)
        setLoadState('ready')
      } catch {
        if (!disposed) setLoadState('error')
      }
    }

    void mount()
    return () => {
      disposed = true
      observer?.disconnect()
      if (app?.renderer) app.destroy(true, { children: true })
    }
  }, [attempt])

  return <>
    {loadState === 'loading' && <p role="status">Loading battle assets…</p>}
    {loadState === 'error' && <div role="alert">Could not load battle assets. <button type="button" onClick={() => { setLoadState('loading'); setAttempt(value => value + 1) }}>Retry</button></div>}
    <div className="battle-arena" role="img" aria-label="Battle arena" ref={host} />
  </>
}
