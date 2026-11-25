import { useEffect, useRef } from 'react'
import title from '../assets/png/retina/ui/menu/title_pirate_battle.png'
import ship from '../assets/png/retina/ships/ship_1.png'
import type { LogTab } from './captainLog/CaptainLog'

export type MenuAction = 'play' | 'options' | LogTab

interface MainMenuProps {
  onSelect: (action: MenuAction) => void
  restoreFocus?: MenuAction
}

export function MainMenu({ onSelect, restoreFocus }: MainMenuProps) {
  const menu = useRef<HTMLElement>(null)

  useEffect(() => {
    if (restoreFocus) menu.current?.querySelector<HTMLButtonElement>(`[data-action="${restoreFocus}"]`)?.focus()
  }, [restoreFocus])

  return (
    <section className="overlay-panel main-menu" aria-labelledby="menu-title" ref={menu}>
      <header className="menu-heading">
        <h1 id="menu-title"><img className="game-logo" src={title} alt="Pirate Battle" /></h1>
        <p className="tagline">Set sail. Take command.</p>
      </header>
      <div className="menu-actions">
        <button className="art-button" type="button" data-action="play" onClick={() => onSelect('play')}>Play</button>
        <button className="art-button" type="button" data-action="options" onClick={() => onSelect('options')}>Options</button>
      </div>
      <img className="menu-ship" src={ship} alt="" />
      <p className="menu-hint">Navigate the islands. Survive the battle.</p>
      <div className="menu-links">
        <button className="art-button art-button-small" type="button" data-action="ranking" onClick={() => onSelect('ranking')}>Ranking</button>
        <button className="art-button art-button-small" type="button" data-action="history" onClick={() => onSelect('history')}>Match History</button>
      </div>
    </section>
  )
}
