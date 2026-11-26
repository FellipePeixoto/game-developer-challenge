import { gameplayConfig } from './gameplayConfig'

export type MatchEndReason = 'time' | 'defeat'

export class MatchSession {
  remainingSeconds: number
  health: number = gameplayConfig.player.maxHealth
  score = 0
  endReason: MatchEndReason | null = null

  constructor(durationSeconds: number) {
    this.remainingSeconds = durationSeconds
  }

  advance(deltaSeconds: number): void {
    if (this.endReason) return
    this.remainingSeconds = Math.max(0, this.remainingSeconds - deltaSeconds)
    if (this.remainingSeconds === 0) this.endReason = 'time'
  }

  damage(amount: number): void {
    if (this.endReason) return
    this.health = Math.max(0, this.health - amount)
    if (this.health === 0) this.endReason = 'defeat'
  }

  awardKill(): void {
    if (!this.endReason) this.score += 1
  }
}
