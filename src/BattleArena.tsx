import { useEffect, useRef, useState } from 'react'
import { ArenaInput, type ArenaCommand } from './arena/ArenaInput'
import { PixiArena } from './arena/PixiArena'
import type { MatchEndReason, MatchSnapshot } from './arena/MatchSession'
import { MatchHud } from './MatchHud'

type LoadState = 'loading' | 'error' | 'ready'

interface BattleArenaProps {
  active: boolean
  spawnIntervalSeconds: number
  durationSeconds: number
  restorePauseFocus?: boolean
  onPause: () => void
  onEnd: (reason: MatchEndReason) => void
  phase: 'Playing' | 'Paused' | 'Finished'
}

export function BattleArena({ active, spawnIntervalSeconds, durationSeconds, restorePauseFocus, onPause, onEnd, phase }: BattleArenaProps) {
  const host = useRef<HTMLDivElement>(null)
  const pauseButton = useRef<HTMLButtonElement>(null)
  const mountedArena = useRef<PixiArena | null>(null)
  const onEndRef = useRef(onEnd)
  const input = useRef<ArenaInput | null>(null)
  const [attempt, setAttempt] = useState(0)
  const [loadState, setLoadState] = useState<LoadState>('loading')
  const [match, setMatch] = useState<MatchSnapshot | null>(null)

  if (input.current === null) input.current = new ArenaInput()

  useEffect(() => { onEndRef.current = onEnd }, [onEnd])

  useEffect(() => {
    const container = host.current
    const controls = input.current
    if (!container || !controls) return

    const arena = new PixiArena(container, controls, spawnIntervalSeconds, durationSeconds,
      reason => onEndRef.current(reason), setMatch)
    mountedArena.current = arena
    void arena.mount().then(
      () => { if (mountedArena.current === arena) setLoadState('ready') },
      () => { if (mountedArena.current === arena) setLoadState('error') },
    )

    return () => {
      mountedArena.current = null
      arena.destroy()
    }
  }, [attempt, spawnIntervalSeconds, durationSeconds])

  useEffect(() => {
    mountedArena.current?.setActive(active && loadState === 'ready')
  }, [active, loadState])

  useEffect(() => {
    if (active && restorePauseFocus) pauseButton.current?.focus()
  }, [active, restorePauseFocus])

  function renderControl({ code, label, key }: { code: ArenaCommand; label: string; key: string }) {
    return <button
      key={code}
      type="button"
      className="round-button"
      data-icon={code}
      data-key={key}
      aria-label={label}
      aria-keyshortcuts={key}
      onPointerDown={event => { event.preventDefault(); input.current?.press(code) }}
      onPointerUp={() => input.current?.release(code)}
      onPointerCancel={() => input.current?.release(code)}
      onPointerLeave={() => input.current?.release(code)}
    />
  }

  return <>
    {active && loadState === 'loading' && <p className="arena-message" role="status">Loading battle assets…</p>}
    {active && loadState === 'error' && <div className="arena-message" role="alert">Could not load battle assets. <button type="button" onClick={() => { setLoadState('loading'); setAttempt(value => value + 1) }}>Retry</button></div>}
    <div className="battle-arena" role="img" aria-label="Battle arena" aria-hidden={!active} ref={host} />
    {active && loadState === 'ready' && <>
      <div className="touch-controls" role="group" aria-label="Movement controls">
        {ArenaInput.movementCommands.map(renderControl)}
      </div>
      <div className="touch-controls touch-controls-fire" role="group" aria-label="Weapon controls">
        {ArenaInput.fireCommands.map(renderControl)}
      </div>
    </>}
    {match && (
      <section className="session-hud" aria-label="Battle controls">
        <MatchHud match={match} phase={phase} />
        {active && <button ref={pauseButton} type="button" className="round-button" data-icon="pause" aria-label="Pause" onClick={onPause} />}
      </section>
    )}
  </>
}
