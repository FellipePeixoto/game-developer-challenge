import { useEffect, useRef, useState } from 'react'
import { MainMenu } from './MainMenu'
import { BattleArena } from './BattleArena'
import type { MenuAction } from './MainMenu'
import { OptionsScreen } from './OptionsScreen'
import { loadSessionOptions } from './sessionOptions'
import type { SessionOptions } from './sessionOptions'

type Screen =
  | { name: 'menu'; restoreFocus?: MenuAction }
  | { name: MenuAction; settings: SessionOptions }

export function App() {
  const [screen, setScreen] = useState<Screen>({ name: 'menu' })
  const sessionHeading = useRef<HTMLHeadingElement>(null)

  useEffect(() => {
    if (screen.name === 'play') sessionHeading.current?.focus()
  }, [screen.name])

  function openScreen(name: MenuAction) {
    setScreen({ name, settings: loadSessionOptions() })
  }

  if (screen.name === 'menu') {
    return <MainMenu onSelect={openScreen} restoreFocus={screen.restoreFocus} />
  }

  if (screen.name === 'options') {
    return (
      <OptionsScreen
        settings={screen.settings}
        onClose={() => setScreen({ name: 'menu', restoreFocus: 'options' })}
      />
    )
  }

  return (
    <main className="card inner-screen">
      <h1 ref={sessionHeading} tabIndex={-1}>Session setup</h1>
      <BattleArena />
      <section aria-labelledby="session-settings">
        <h2 id="session-settings">Session settings</h2>
        <dl className="session-settings">
          <div><dt>Game session time</dt><dd>{screen.settings.durationSeconds} seconds</dd></div>
          <div><dt>Enemy spawn time</dt><dd>{screen.settings.spawnIntervalSeconds} seconds</dd></div>
        </dl>
      </section>
      <button type="button" onClick={() => setScreen({ name: 'menu', restoreFocus: 'play' })}>
        Main Menu
      </button>
    </main>
  )
}
