import { useEffect, useRef, useState } from 'react'
import { ArenaInput } from './arena/ArenaInput'
import { PixiArena } from './arena/PixiArena'

type LoadState = 'loading' | 'error' | 'ready'

interface BattleArenaProps {
  active: boolean
  restorePauseFocus?: boolean
  onPause: () => void
}

export function BattleArena({ active, restorePauseFocus, onPause }: BattleArenaProps) {
  const host = useRef<HTMLDivElement>(null)
  const pauseButton = useRef<HTMLButtonElement>(null)
  const mountedArena = useRef<PixiArena | null>(null)
  const input = useRef<ArenaInput | null>(null)
  const [attempt, setAttempt] = useState(0)
  const [loadState, setLoadState] = useState<LoadState>('loading')

  if (input.current === null) input.current = new ArenaInput()

  useEffect(() => {
    const container = host.current
    const controls = input.current
    if (!container || !controls) return

    const arena = new PixiArena(container, controls)
    mountedArena.current = arena
    void arena.mount().then(
      () => { if (mountedArena.current === arena) setLoadState('ready') },
      () => { if (mountedArena.current === arena) setLoadState('error') },
    )

    return () => {
      mountedArena.current = null
      arena.destroy()
    }
  }, [attempt])

  useEffect(() => {
    mountedArena.current?.setActive(active && loadState === 'ready')
  }, [active, loadState])

  useEffect(() => {
    if (active && restorePauseFocus) pauseButton.current?.focus()
  }, [active, restorePauseFocus])

  return <>
    {active && loadState === 'loading' && <p className="arena-message" role="status">Loading battle assets…</p>}
    {active && loadState === 'error' && <div className="arena-message" role="alert">Could not load battle assets. <button type="button" onClick={() => { setLoadState('loading'); setAttempt(value => value + 1) }}>Retry</button></div>}
    <div className="battle-arena" role="img" aria-label="Battle arena" aria-hidden={!active} ref={host} />
    {active && loadState === 'ready' && <div className="touch-controls" role="group" aria-label="Movement controls">
      {ArenaInput.commands.map(command =>
        <button
          key={command.code}
          type="button"
          className="round-button"
          data-icon={command.code}
          aria-label={command.label}
          onPointerDown={event => { event.preventDefault(); input.current?.press(command.code) }}
          onPointerUp={() => input.current?.release(command.code)}
          onPointerCancel={() => input.current?.release(command.code)}
          onPointerLeave={() => input.current?.release(command.code)}
        />)}
    </div>}
    {active && (
      <section className="session-hud" aria-label="Battle controls">
        <button ref={pauseButton} type="button" className="round-button" data-icon="pause" aria-label="Pause" onClick={onPause} />
      </section>
    )}
  </>
}
