import type { MatchSnapshot } from './arena/MatchSession'

interface MatchHudProps {
  match: MatchSnapshot
  phase: 'Playing' | 'Paused' | 'Finished'
}

export function MatchHud({ match, phase }: MatchHudProps) {
  const minutes = Math.floor(match.remainingSeconds / 60)
  const seconds = String(match.remainingSeconds % 60).padStart(2, '0')

  return <div className="match-hud" role="region" aria-label="Match status">
    <span>Score {match.score}</span>
    <span>Time {minutes}:{seconds}</span>
    <span>Health {match.health} / {match.maxHealth}</span>
    <span>{phase}</span>
  </div>
}
