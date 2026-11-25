import { useEffect, useRef, useState } from 'react'
import { ArenaInput } from './arena/ArenaInput'
import { PixiArena } from './arena/PixiArena'

type LoadState = 'loading' | 'error' | 'ready'

export function BattleArena() {
  const host = useRef<HTMLDivElement>(null)
  const input = useRef<ArenaInput | null>(null)
  const [attempt, setAttempt] = useState(0)
  const [loadState, setLoadState] = useState<LoadState>('loading')

  if (input.current === null) input.current = new ArenaInput()

  useEffect(() => {
    const container = host.current
    const controls = input.current
    if (!container || !controls) return

    const arena = new PixiArena(container, controls)
    void arena.mount().then(
      () => setLoadState('ready'),
      () => setLoadState('error'),
    )

    return () => arena.destroy()
  }, [attempt])

  return <>
    {loadState === 'loading' && <p role="status">Loading battle assets…</p>}
    {loadState === 'error' && <div role="alert">Could not load battle assets. <button type="button" onClick={() => { setLoadState('loading'); setAttempt(value => value + 1) }}>Retry</button></div>}
    <div className="battle-arena" role="img" aria-label="Battle arena" ref={host} />
    {loadState === 'ready' && <div className="touch-controls" aria-label="Movement controls">
      {ArenaInput.commands.map(command =>
        <button
          key={command.code}
          type="button"
          onPointerDown={event => { event.preventDefault(); input.current?.press(command.code) }}
          onPointerUp={() => input.current?.release(command.code)}
          onPointerCancel={() => input.current?.release(command.code)}
          onPointerLeave={() => input.current?.release(command.code)}
        >{command.label}</button>)}
    </div>}
  </>
}
