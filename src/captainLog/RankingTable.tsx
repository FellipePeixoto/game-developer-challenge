import scoreIcon from '../../assets/png/retina/ui/hud/icon_score.png'
import type { RankingEntry } from './sampleRecords'

interface RankingTableProps {
  entries: readonly RankingEntry[]
  rankOffset: number
  playerName: string
}

export function RankingTable({ entries, rankOffset, playerName }: RankingTableProps) {
  return (
    <table className="log-ranking" aria-label="Ranking">
      <thead>
        <tr>
          <th scope="col">Rank</th>
          <th scope="col">Captain</th>
          <th scope="col">Points</th>
          <th scope="col">Played</th>
        </tr>
      </thead>
      <tbody>
        {entries.map(([captain, points, played], position) => {
          const rank = rankOffset + position + 1
          const isPlayer = captain === playerName

          return (
            <tr key={captain} className={isPlayer ? 'log-highlight' : undefined}>
              <td className={rank <= 3 ? 'log-points' : undefined}>{String(rank).padStart(2, '0')}</td>
              <td>
                <span className="log-captain">
                  {rank === 1 && <img src={scoreIcon} alt="" />}
                  <span>{captain}</span>
                  {isPlayer && <span className="log-badge">You</span>}
                </span>
              </td>
              <td className="log-points">{points}</td>
              <td className="log-meta">{played}</td>
            </tr>
          )
        })}
      </tbody>
    </table>
  )
}
