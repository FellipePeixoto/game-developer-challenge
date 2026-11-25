import { useEffect, useRef, useState } from 'react'
import type { KeyboardEvent } from 'react'

const tabs = ['Ranking', 'Match History'] as const
export type MenuAction = 'play' | 'options'

interface MainMenuProps {
  onSelect: (action: MenuAction) => void
  restoreFocus?: MenuAction
}

export function MainMenu({ onSelect, restoreFocus }: MainMenuProps) {
  const [activeTab, setActiveTab] = useState(0)
  const tabList = useRef<HTMLDivElement>(null)
  const playButton = useRef<HTMLButtonElement>(null)
  const optionsButton = useRef<HTMLButtonElement>(null)

  useEffect(() => {
    if (restoreFocus === 'play') playButton.current?.focus()
    if (restoreFocus === 'options') optionsButton.current?.focus()
  }, [restoreFocus])

  function handleTabKey(event: KeyboardEvent<HTMLDivElement>) {
    let nextTab: number
    switch (event.key) {
      case 'ArrowRight':
        nextTab = (activeTab + 1) % tabs.length
        break
      case 'ArrowLeft':
        nextTab = (activeTab + tabs.length - 1) % tabs.length
        break
      case 'Home':
        nextTab = 0
        break
      case 'End':
        nextTab = tabs.length - 1
        break
      default:
        return
    }

    event.preventDefault()
    setActiveTab(nextTab)
    tabList.current?.querySelectorAll('button')[nextTab]?.focus()
  }

  return (
    <main className="main-menu">
      <header className="hero card">
        <div className="hero-content">
          <h1>Pirate Battle</h1>
          <div className="actions">
            <button className="primary" type="button" ref={playButton} onClick={() => onSelect('play')}>
              Play
            </button>
            <button type="button" ref={optionsButton} onClick={() => onSelect('options')}>
              Options
            </button>
          </div>
        </div>
      </header>

      <div className="menu-panels">
        <section className="card controls" aria-labelledby="controls-heading">
          <h2 id="controls-heading">Controls</h2>
          <dl className="control-list">
            <div><dt>Move forward</dt><dd><kbd>W</kbd></dd></div>
            <div><dt>Turn left / right</dt><dd><kbd>A</kbd> <kbd>D</kbd></dd></div>
            <div><dt>Fire forward</dt><dd><kbd>Space</kbd></dd></div>
            <div><dt>Fire left / right</dt><dd><kbd>Q</kbd> <kbd>E</kbd></dd></div>
            <div><dt>Pause</dt><dd><kbd>Esc</kbd></dd></div>
          </dl>
        </section>

        <section className="card records" aria-label="Match records">
          <div className="tab-list" ref={tabList} role="tablist" aria-label="Match records" onKeyDown={handleTabKey}>
            {tabs.map((tab, index) => (
              <button
                key={tab}
                id={`records-tab-${index}`}
                aria-controls={`records-panel-${index}`}
                aria-selected={index === activeTab}
                tabIndex={index === activeTab ? 0 : -1}
                role="tab"
                type="button"
                onClick={() => setActiveTab(index)}
              >
                {tab}
              </button>
            ))}
          </div>
          {tabs.map((tab, index) => (
            <div
              className="tab-panel"
              key={tab}
              id={`records-panel-${index}`}
              role="tabpanel"
              aria-labelledby={`records-tab-${index}`}
              hidden={index !== activeTab}
              tabIndex={0}
            >
              <p>{tab} is currently unavailable.</p>
            </div>
          ))}
        </section>
      </div>
    </main>
  )
}
