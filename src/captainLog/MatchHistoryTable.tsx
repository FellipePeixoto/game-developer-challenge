import type { HistoryEntry } from './sampleRecords'

interface MatchHistoryTableProps {
  entries: readonly HistoryEntry[]
  highlightLatest: boolean
}

export function MatchHistoryTable({ entries, highlightLatest }: MatchHistoryTableProps) {
  return (
    <table className="log-history" aria-label="Match History">
      <thead>
        <tr>
          <th scope="col">Date</th>
          <th scope="col">Points</th>
          <th scope="col">Duration</th>
          <th scope="col">Result</th>
        </tr>
      </thead>
      <tbody>
        {entries.map(([date, time, points, duration, result], position) => (
          <tr key={`${date} ${time}`} className={highlightLatest && position === 0 ? 'log-highlight' : undefined}>
            <td><span className="log-date">{date}</span><span className="log-meta"> · {time}</span></td>
            <td className="log-points">{points}</td>
            <td>{duration}</td>
            <td className={result === 'Time up' ? 'log-time-up' : 'log-defeated'}>{result}</td>
          </tr>
        ))}
      </tbody>
    </table>
  )
}
