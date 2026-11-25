import { useEffect, useRef, useState } from 'react'
import type { FormEvent } from 'react'
import { loadSessionOptions, saveSessionOptions, sessionOptionFields } from './sessionOptions'
import type { SessionOption } from './sessionOptions'

const fieldNames = ['durationSeconds', 'spawnIntervalSeconds'] as const

interface OptionsScreenProps {
  closeLabel?: string
  onClose: () => void
}

export function OptionsScreen({ closeLabel = 'Main Menu', onClose }: OptionsScreenProps) {
  const [options, setOptions] = useState(loadSessionOptions)
  const [saveFailed, setSaveFailed] = useState(false)
  const heading = useRef<HTMLHeadingElement>(null)

  useEffect(() => {
    heading.current?.focus()
  }, [])

  function adjust(name: SessionOption, delta: number) {
    const { min, max } = sessionOptionFields[name]
    setOptions(current => ({ ...current, [name]: Math.max(min, Math.min(max, current[name] + delta)) }))
  }

  function handleSubmit(event: FormEvent<HTMLFormElement>) {
    event.preventDefault()
    try {
      saveSessionOptions(options)
    } catch {
      setSaveFailed(true)
      return
    }
    onClose()
  }

  return (
    <section className="overlay-panel inner-screen" aria-labelledby="options-title">
      <h1 id="options-title" ref={heading} tabIndex={-1}>Options</h1>
      <form className="options-form" onSubmit={handleSubmit}>
        {fieldNames.map(name => {
          const { label, min, max } = sessionOptionFields[name]
          const value = options[name]

          return (
            <div className="option-field" key={name}>
              <p id={name}>{label}</p>
              <button className="round-button" type="button" data-icon="minus" disabled={value === min}
                aria-label={`Decrease ${label.toLowerCase()}`} onClick={() => adjust(name, -1)} />
              <output aria-labelledby={name}>{value} s</output>
              <button className="round-button" type="button" data-icon="plus" disabled={value === max}
                aria-label={`Increase ${label.toLowerCase()}`} onClick={() => adjust(name, 1)} />
            </div>
          )
        })}

        {saveFailed && <p className="form-errors" role="alert">Options could not be saved. Check whether the browser allows local storage and try again.</p>}
        <button type="submit" className="art-button">{closeLabel}</button>
      </form>
    </section>
  )
}
