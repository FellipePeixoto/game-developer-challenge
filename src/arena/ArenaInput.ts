export type ArenaCommand = 'KeyA' | 'KeyW' | 'KeyD'

export class ArenaInput {
  static readonly commands: ReadonlyArray<{ code: ArenaCommand; label: string }> = [
    { code: 'KeyA', label: 'Turn left' },
    { code: 'KeyW', label: 'Forward' },
    { code: 'KeyD', label: 'Turn right' },
  ]

  private readonly pressed = new Set<ArenaCommand>()
  private listening = false

  private readonly handleKeyDown = (event: KeyboardEvent) => {
    if (!this.isCommand(event.code)) return
    event.preventDefault()
    this.press(event.code)
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
  }

  press(command: ArenaCommand): void {
    this.pressed.add(command)
  }

  release(command: ArenaCommand): void {
    this.pressed.delete(command)
  }

  isPressed(command: ArenaCommand): boolean {
    return this.pressed.has(command)
  }

  private isCommand(code: string): code is ArenaCommand {
    return code === 'KeyA' || code === 'KeyW' || code === 'KeyD'
  }
}
