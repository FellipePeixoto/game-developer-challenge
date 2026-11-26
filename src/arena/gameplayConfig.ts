export const gameplayConfig = {
  enemySpawn: {
    chaserChance: 0.5,
  },
  player: {
    maxHealth: 3,
    // pixels/sec
    movementSpeed: 80,
    // radianos/sec
    turningSpeed: 0.75,
  },
  chaser: {
    minimumSpawnDistance: 160,
    movementSpeed: 100,
    impactDamage: 1,
    explosionSeconds: 0.4,
  },
  shooter: {
    minimumSpawnDistance: 160,
    movementSpeed: 80,
    attackRange: 260,
    cooldownSeconds: 1.5,
    projectileSpeed: 240,
    projectileLifetimeSeconds: 3,
    projectileDamage: 1,
    projectileRadius: 3,
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
