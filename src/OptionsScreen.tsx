import { useEffect, useRef, useState } from 'react'
import type { FormEvent } from 'react'
import { isSessionOptionValue, saveSessionOptions, sessionOptionFields } from './sessionOptions'
import type { SessionOption, SessionOptions } from './sessionOptions'

const fieldNames = ['durationSeconds', 'spawnIntervalSeconds'] as const

interface OptionsScreenProps {
  settings: SessionOptions
  onClose: () => void
}

export function OptionsScreen({ settings, onClose }: OptionsScreenProps) {
  const [invalidFields, setInvalidFields] = useState<SessionOption[]>([])
  const [saveFailed, setSaveFailed] = useState(false)
  const firstInput = useRef<HTMLInputElement>(null)

  useEffect(() => {
    firstInput.current?.focus()
  }, [])

  function handleSubmit(event: FormEvent<HTMLFormElement>) {
    event.preventDefault()
    const form = event.currentTarget
    const data = new FormData(form)
    const options: SessionOptions = {
      durationSeconds: Number(data.get('durationSeconds')),
      spawnIntervalSeconds: Number(data.get('spawnIntervalSeconds')),
    }
    const invalid = fieldNames.filter((name) => !isSessionOptionValue(name, options[name]))

    setInvalidFields(invalid)
    setSaveFailed(false)
    if (invalid.length) {
      const field = form.elements.namedItem(invalid[0])
      if (field instanceof HTMLInputElement) field.focus()
      return
    }

    try {
      saveSessionOptions(options)
    } catch {
      setSaveFailed(true)
      return
    }

    onClose()
  }

  return (
    <main className="card inner-screen">
      <h1>Options</h1>
      <form className="options-form" noValidate onSubmit={handleSubmit}>
        {fieldNames.map((name, index) => {
          const { label, min, max } = sessionOptionFields[name]
          const invalid = invalidFields.includes(name)

          return (
            <div className="option-field" key={name}>
              <label htmlFor={name}>{label}</label>
              <p id={`${name}-range`}>{min}–{max} seconds</p>
              <input
                ref={index === 0 ? firstInput : undefined}
                id={name}
                name={name}
                type="number"
                inputMode="numeric"
                min={min}
                max={max}
                step={1}
                required
                defaultValue={settings[name]}
                aria-describedby={invalid ? `${name}-range ${name}-error` : `${name}-range`}
                aria-invalid={invalid || undefined}
              />
            </div>
          )
        })}

        {(invalidFields.length > 0 || saveFailed) && (
          <ul className="form-errors" role="alert">
            {invalidFields.map((name) => {
              const { label, min, max } = sessionOptionFields[name]
              return <li key={name} id={`${name}-error`}>{label}. Enter a whole number from {min} to {max}.</li>
            })}
            {saveFailed && <li>Options could not be saved. Check whether the browser allows local storage and try again.</li>}
          </ul>
        )}

        <div className="actions">
          <button type="submit" className="primary">Save options</button>
          <button type="button" onClick={onClose}>Back</button>
        </div>
      </form>
    </main>
  )
}
