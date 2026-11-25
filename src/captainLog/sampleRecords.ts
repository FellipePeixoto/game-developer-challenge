export type RankingEntry = readonly [captain: string, points: number, played: string]
export type HistoryEntry = readonly [
  date: string,
  time: string,
  points: number,
  duration: string,
  result: 'Time up' | 'Defeated',
]

export const playerName = 'Captain Jack'
export const rankingCaption = '120 second battles · 3 second spawn interval'

export const sampleRanking: readonly RankingEntry[] = [
  ['Captain Flint', 38, '08 Sep · 21:42'],
  ['Red Sparrow', 32, '08 Sep · 20:18'],
  [playerName, 24, '08 Sep · 19:36'],
  ['Storm Rider', 21, '08 Sep · 18:50'],
  ['Sea Wolf', 19, '08 Sep · 18:24'],
  ['Black Pearl', 18, '08 Sep · 17:42'],
  ['Iron Tide', 17, '08 Sep · 17:09'],
  ['Anne Storm', 16, '08 Sep · 16:15'],
  ['Blue Lantern', 15, '08 Sep · 15:33'],
  ['Coral Queen', 14, '08 Sep · 14:51'],
  ['Old Salt', 13, '07 Sep · 22:24'],
  ['Driftwood', 12, '07 Sep · 21:02'],
  ['Silver Gale', 11, '07 Sep · 20:14'],
  ['Harbor Ghost', 10, '07 Sep · 19:36'],
  ['Night Sail', 9, '07 Sep · 18:20'],
]

export const sampleHistory: readonly HistoryEntry[] = [
  ['08 Sep', '19:36', 24, '02:00', 'Time up'],
  ['08 Sep', '19:28', 18, '01:42', 'Defeated'],
  ['08 Sep', '19:20', 22, '02:00', 'Time up'],
  ['08 Sep', '19:12', 11, '01:18', 'Defeated'],
  ['07 Sep', '22:05', 20, '02:00', 'Time up'],
  ['07 Sep', '21:58', 16, '01:47', 'Defeated'],
  ['07 Sep', '21:50', 19, '02:00', 'Time up'],
  ['07 Sep', '21:42', 12, '01:26', 'Defeated'],
  ['07 Sep', '21:34', 15, '02:00', 'Time up'],
  ['07 Sep', '21:26', 9, '01:05', 'Defeated'],
]
