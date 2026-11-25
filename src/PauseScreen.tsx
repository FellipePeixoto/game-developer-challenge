import { useEffect, useRef } from 'react'

interface PauseScreenProps {
  onResume: () => void
  onOptions: () => void
  onMainMenu: () => void
}

export function PauseScreen({ onResume, onOptions, onMainMenu }: PauseScreenProps) {
  const resumeButton = useRef<HTMLButtonElement>(null)

  useEffect(() => {
    resumeButton.current?.focus()
  }, [])

  return (
    <section className="overlay-panel inner-screen" aria-labelledby="pause-title">
      <h1 id="pause-title">Paused</h1>
      <p className="menu-hint">Ready when you are.</p>
      <div className="menu-actions">
        <button ref={resumeButton} className="art-button" type="button" onClick={onResume}>Resume</button>
        <button className="art-button" type="button" onClick={onOptions}>Options</button>
        <button className="art-button" type="button" onClick={onMainMenu}>Main Menu</button>
      </div>
    </section>
  )
}
