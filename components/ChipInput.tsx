'use client'

import { useState, KeyboardEvent, useRef } from 'react'
import styles from './ChipInput.module.css'

interface ChipInputProps {
  keywords: string[]
  onChange: (keywords: string[]) => void
  placeholder?: string
}

export default function ChipInput({ keywords, onChange, placeholder }: ChipInputProps) {
  const [value, setValue] = useState('')
  const ref = useRef<HTMLDivElement>(null)

  function handleKeyDown(e: KeyboardEvent<HTMLInputElement>) {
    const trimmed = value.trim()
    if ((e.key === 'Enter' || e.key === ',') && trimmed) {
      e.preventDefault()
      if (!keywords.includes(trimmed)) {
        onChange([...keywords, trimmed])
      }
      setValue('')
    }
    if (e.key === 'Backspace' && !value && keywords.length > 0) {
      onChange(keywords.slice(0, -1))
    }
  }

  function removeKeyword(kw: string) {
    onChange(keywords.filter(k => k !== kw))
  }

  return (
    <div
      className={styles.wrapper}
      onClick={() => ref.current?.querySelector('input')?.focus()}
      ref={ref}
    >
      {keywords.map((kw) => (
        <span key={kw} className={styles.chip}>
          {kw}
          <button
            type="button"
            className={styles.chipRemove}
            onClick={(e) => { e.stopPropagation(); removeKeyword(kw) }}
          >
            ×
          </button>
        </span>
      ))}
      <input
        className={styles.input}
        value={value}
        onChange={(e) => setValue(e.target.value)}
        onKeyDown={handleKeyDown}
        placeholder={keywords.length === 0 ? (placeholder ?? 'Type keyword and press Enter') : ''}
      />
    </div>
  )
}
