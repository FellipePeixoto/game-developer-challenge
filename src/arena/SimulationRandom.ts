const SEED_RANGE = 0x1_0000_0000

export function readSimulationSeed(search: string): number | undefined {
  const value = new URLSearchParams(search).get('seed')
  if (value === null || !/^\d+$/.test(value)) return
  const seed = Number(value)
  return seed < SEED_RANGE ? seed : undefined
}

export function createSimulationRandom(seed = crypto.getRandomValues(new Uint32Array(1))[0]): () => number {
  let state = seed
  return () => {
    state = (Math.imul(state, 1_664_525) + 1_013_904_223) >>> 0
    return state / SEED_RANGE
  }
}
