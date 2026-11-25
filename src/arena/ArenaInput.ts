import type { FireCommand } from './gameplayConfig'

type MovementCommand = 'KeyA' | 'KeyW' | 'KeyD'
export type ArenaCommand = MovementCommand | FireCommand

export class ArenaInput {
  static readonly movementCommands: ReadonlyArray<{ code: MovementCommand; label: string; key: string }> = [
    { code: 'KeyA', label: 'Turn left', key: 'A' },
    { code: 'KeyW', label: 'Forward', key: 'W' },
    { code: 'KeyD', label: 'Turn right', key: 'D' },
  ]
  static readonly fireCommands: ReadonlyArray<{ code: FireCommand; label: string; key: string }> = [
    { code: 'KeyQ', label: 'Fire left', key: 'Q' },
    { code: 'Space', label: 'Fire front', key: 'Space' },
    { code: 'KeyE', label: 'Fire right', key: 'E' },
  ]

  private readonly pressed = new Set<ArenaCommand>()
  private readonly pendingFire = new Set<FireCommand>()
  private listening = false

  private readonly handleKeyDown = (event: KeyboardEvent) => {
    if (!this.isCommand(event.code)) return
    event.preventDefault()
    if (!event.repeat) this.press(event.code)
  }

  private readonly handleKeyUp = (event: KeyboardEvent) => {
    if (this.isCommand(event.code)) this.release(event.code)
  }

  start(): void {
    if (this.listening) return
    this.listening = true
    window.addEventListener('keydown', this.handleKeyDown)
    window.addEventListener('keyup', this.handleKeyUp)
  }

  stop(): void {
    if (this.listening) {
      window.removeEventListener('keydown', this.handleKeyDown)
      window.removeEventListener('keyup', this.handleKeyUp)
      this.listening = false
    }
    this.pressed.clear()
    this.pendingFire.clear()
  }

  press(command: ArenaCommand): void {
    if (this.isFireCommand(command) && !this.pressed.has(command)) this.pendingFire.add(command)
    this.pressed.add(command)
  }

  release(command: ArenaCommand): void {
    this.pressed.delete(command)
  }

  isPressed(command: ArenaCommand): boolean {
    return this.pressed.has(command)
  }

  isFiring(command: FireCommand): boolean {
    return this.pendingFire.delete(command) || this.isPressed(command)
  }

  private isCommand(code: string): code is ArenaCommand {
    return this.isFireCommand(code) || ArenaInput.movementCommands.some(command => command.code === code)
  }

  private isFireCommand(code: string): code is FireCommand {
    return ArenaInput.fireCommands.some(command => command.code === code)
  }
}
