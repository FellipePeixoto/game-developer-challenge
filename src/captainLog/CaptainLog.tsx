import { useEffect, useRef, useState } from 'react'
import type { KeyboardEvent } from 'react'
import { MatchHistoryTable } from './MatchHistoryTable'
import { RankingTable } from './RankingTable'
import { playerName, rankingCaption, sampleHistory, sampleRanking } from './sampleRecords'

const tabs = [
  { name: 'ranking', label: 'Ranking' },
  { name: 'history', label: 'Match History' },
] as const

export type LogTab = (typeof tabs)[number]['name']

const pageSize = 5

interface CaptainLogProps {
  initialTab: LogTab
  onClose: () => void
}

export function CaptainLog({ initialTab, onClose }: CaptainLogProps) {
  const [activeTab, setActiveTab] = useState(tabs[0].name === initialTab ? 0 : 1)
  const [page, setPage] = useState(0)
  const tabList = useRef<HTMLDivElement>(null)
  const isRanking = tabs[activeTab].name === 'ranking'
  const pageCount = Math.ceil((isRanking ? sampleRanking.length : sampleHistory.length) / pageSize)
  const firstRow = page * pageSize
  const lastRow = firstRow + pageSize

  useEffect(() => {
    tabList.current?.querySelector<HTMLButtonElement>('[aria-selected="true"]')?.focus()
  }, [])

  function selectTab(index: number) {
    if (index === activeTab) return
    setActiveTab(index)
    setPage(0)
  }

  function handleTabKey(event: KeyboardEvent<HTMLDivElement>) {
    let nextTab: number
    switch (event.key) {
      case 'ArrowRight':
        nextTab = (activeTab + 1) % tabs.length
        break
      case 'ArrowLeft':
        nextTab = (activeTab + tabs.length - 1) % tabs.length
        break
      case 'Home':
        nextTab = 0
        break
      case 'End':
        nextTab = tabs.length - 1
        break
      default:
        return
    }

    event.preventDefault()
    selectTab(nextTab)
    tabList.current?.querySelectorAll('button')[nextTab]?.focus()
  }

  return (
    <section className="overlay-panel inner-screen captain-log" aria-labelledby="log-title">
      <h1 id="log-title">Captain's Log</h1>
      <div className="menu-links" ref={tabList} role="tablist" aria-label="Captain's log" onKeyDown={handleTabKey}>
        {tabs.map(({ name, label }, index) => (
          <button
            key={name}
            id={`tab-${name}`}
            className="art-button art-button-small"
            type="button"
            role="tab"
            aria-controls={`panel-${name}`}
            aria-selected={index === activeTab}
            tabIndex={index === activeTab ? 0 : -1}
            onClick={() => selectTab(index)}
          >{label}</button>
        ))}
      </div>
      <div className="log-content">
        {tabs.map(({ name }, index) => (
          <div key={name} id={`panel-${name}`} role="tabpanel" aria-labelledby={`tab-${name}`} hidden={index !== activeTab}>
            {index === activeTab && (
              <>
                <p className="log-caption">{isRanking ? rankingCaption : `${playerName} · Your recent battles`}</p>
                {isRanking
                  ? <RankingTable entries={sampleRanking.slice(firstRow, lastRow)} rankOffset={firstRow} playerName={playerName} />
                  : <MatchHistoryTable entries={sampleHistory.slice(firstRow, lastRow)} highlightLatest={page === 0} />}
              </>
            )}
          </div>
        ))}
      </div>
      <nav className="log-pagination" aria-label={isRanking ? 'Ranking pages' : 'Match history pages'}>
        <button className="round-button" type="button" data-icon="KeyA" aria-label="Previous page"
          disabled={page === 0} onClick={() => setPage(page - 1)} />
        <output aria-label="Current page">Page {page + 1} of {pageCount}</output>
        <button className="round-button" type="button" data-icon="KeyD" aria-label="Next page"
          disabled={page === pageCount - 1} onClick={() => setPage(page + 1)} />
      </nav>
      <button className="art-button" type="button" onClick={onClose}>Main Menu</button>
    </section>
  )
}
