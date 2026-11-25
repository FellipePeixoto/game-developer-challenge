import { useEffect, useRef } from 'react'
import { Application, Graphics } from 'pixi.js'

export function BattleArena() {
  const host = useRef<HTMLDivElement>(null)

  useEffect(() => {
    const container = host.current
    if (!container) return
    const element = container
    const app = new Application()
    let disposed = false

    async function mount() {
      await app.init({ width: 960, height: 540, background: '#147089', resizeTo: element })
      if (disposed) {
        app.destroy(true)
        return
      }
      const water = new Graphics().rect(0, 0, 960, 540).fill('#147089')
      app.stage.addChild(water)
      element.appendChild(app.canvas)
    }

    void mount()
    return () => {
      disposed = true
      if (app.renderer) app.destroy(true, { children: true })
    }
  }, [])

  return <div className="battle-arena" role="img" aria-label="Battle arena" ref={host} />
}
