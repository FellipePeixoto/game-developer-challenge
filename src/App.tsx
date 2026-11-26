import { useState } from 'react'
import { MainMenu } from './MainMenu'
import jungleLogo from '../assets/logo_jungle_gaming.svg'
import { BattleArena } from './BattleArena'
import { CaptainLog } from './captainLog/CaptainLog'
import type { MenuAction } from './MainMenu'
import { OptionsScreen } from './OptionsScreen'
import { PauseScreen } from './PauseScreen'
import { loadSessionOptions } from './sessionOptions'
import type { SessionOptions } from './sessionOptions'
import type { MatchEndReason } from './arena/MatchSession'

type Screen =
  | { name: 'menu'; restoreFocus?: MenuAction }
  | { name: 'options' | 'ranking' | 'history' }
  | { name: 'play'; settings: SessionOptions; restorePauseFocus?: boolean }
  | { name: 'pause' | 'pause-options'; settings: SessionOptions }
  | { name: 'end'; settings: SessionOptions; reason: MatchEndReason }

export function App() {
  const [screen, setScreen] = useState<Screen>({ name: 'menu' })
  const [matchNumber, setMatchNumber] = useState(0)
  const inBattle = screen.name === 'play' || screen.name === 'pause' || screen.name === 'pause-options' || screen.name === 'end'

  function openScreen(name: MenuAction) {
    if (name === 'play') setScreen({ name, settings: loadSessionOptions() })
    else setScreen({ name })
  }

  return (
    <main className="game-shell">
      {inBattle && (
        <BattleArena
          key={matchNumber}
          active={screen.name === 'play'}
          spawnIntervalSeconds={screen.settings.spawnIntervalSeconds}
          durationSeconds={screen.settings.durationSeconds}
          restorePauseFocus={screen.name === 'play' && screen.restorePauseFocus}
          onPause={() => setScreen({ name: 'pause', settings: screen.settings })}
          onEnd={reason => setScreen({ name: 'end', settings: screen.settings, reason })}
          phase={screen.name === 'play' ? 'Playing' : screen.name === 'end' ? 'Finished' : 'Paused'}
        />
      )}
      {screen.name !== 'play' && (
        <>
          <div className="screen-overlay" aria-hidden="true" />
          <img className="studio-logo" src={jungleLogo} alt="Jungle Gaming" />
        </>
      )}
      {screen.name === 'menu' && (
        <MainMenu onSelect={openScreen} restoreFocus={screen.restoreFocus} />
      )}
      {screen.name === 'options' && <OptionsScreen onClose={() => setScreen({ name: 'menu', restoreFocus: 'options' })} />}
      {(screen.name === 'ranking' || screen.name === 'history') && (
        <CaptainLog initialTab={screen.name} onClose={() => setScreen({ name: 'menu', restoreFocus: screen.name })} />
      )}
      {screen.name === 'pause' && (
        <PauseScreen
          onResume={() => setScreen({ name: 'play', settings: screen.settings, restorePauseFocus: true })}
          onOptions={() => setScreen({ name: 'pause-options', settings: screen.settings })}
          onMainMenu={() => setScreen({ name: 'menu', restoreFocus: 'play' })}
        />
      )}
      {screen.name === 'pause-options' && (
        <OptionsScreen closeLabel="Back to Pause" onClose={() => setScreen({ name: 'pause', settings: screen.settings })} />
      )}
      {screen.name === 'end' && (
        <section className="overlay-panel match-end" aria-labelledby="match-end-title">
          <h1 id="match-end-title">{screen.reason === 'time' ? 'Time up' : 'Ship sunk'}</h1>
          <button type="button" className="art-button" onClick={() => {
            setMatchNumber(number => number + 1)
            setScreen({ name: 'play', settings: screen.settings })
          }}>Restart</button>
          <button type="button" className="art-button" onClick={() => setScreen({ name: 'menu', restoreFocus: 'play' })}>Main Menu</button>
        </section>
      )}
    </main>
  )
}
