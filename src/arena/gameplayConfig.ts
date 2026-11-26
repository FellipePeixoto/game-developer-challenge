export const gameplayConfig = {
  player: {
    // pixels/sec
    movementSpeed: 80,
    // radianos/sec
    turningSpeed: 0.75,
  },
  chaser: {
    minimumSpawnDistance: 160,
  },
  weapons: {
    Space: { cooldownSeconds: 0.35 },
    KeyQ: { cooldownSeconds: 0.6 },
    KeyE: { cooldownSeconds: 0.6 },
  },
  projectile: {
    // pixels/sec
    speed: 560,
    lifetimeSeconds: 1,
    radius: 3,
    broadsideSpacing: 12,
  },
} as const

export type FireCommand = keyof typeof gameplayConfig.weapons
