export const sessionOptionFields = {
  durationSeconds: { label: 'Game session time', min: 60, max: 180, defaultValue: 120 },
  spawnIntervalSeconds: { label: 'Enemy spawn time', min: 1, max: 60, defaultValue: 8 },
} as const

export type SessionOption = keyof typeof sessionOptionFields
export type SessionOptions = Readonly<Record<SessionOption, number>>

const storageKey = 'pirate-battle:session-options'
const defaultOptions: SessionOptions = {
  durationSeconds: sessionOptionFields.durationSeconds.defaultValue,
  spawnIntervalSeconds: sessionOptionFields.spawnIntervalSeconds.defaultValue,
}

export function isSessionOptionValue(option: SessionOption, value: unknown): value is number {
  const { min, max } = sessionOptionFields[option]
  return typeof value === 'number' && Number.isInteger(value) && value >= min && value <= max
}

export function loadSessionOptions(): SessionOptions {
  try {
    const stored = localStorage.getItem(storageKey)
    const options: Partial<SessionOptions> | null = stored === null ? null : JSON.parse(stored)

    if (
      options &&
      isSessionOptionValue('durationSeconds', options.durationSeconds) &&
      isSessionOptionValue('spawnIntervalSeconds', options.spawnIntervalSeconds)
    ) {
      return { durationSeconds: options.durationSeconds, spawnIntervalSeconds: options.spawnIntervalSeconds }
    }
  } catch {
    // Unavailable storage or malformed saved data
  }

  return { ...defaultOptions }
}

export function saveSessionOptions(options: SessionOptions): void {
  localStorage.setItem(storageKey, JSON.stringify(options))
}
