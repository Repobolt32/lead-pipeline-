'use client'

import { useState, useRef } from 'react'
import { supabase, isPlaceholder } from '@/lib/supabase'
import { removeByKeywords, mapToOutreachSchema, dedupByPhoneOrUrl, type OutreachLead } from '@/lib/formatLead'
import ChipInput from '@/components/ChipInput'
import Pagination from '@/components/Pagination'
import styles from './page.module.css'

const PAGE_SIZE = 50

export default function ScrapePage() {
  const [city, setCity] = useState('')
  const [rawLeads, setRawLeads] = useState<Record<string, unknown>[]>([])
  const [displayLeads, setDisplayLeads] = useState<Record<string, unknown>[]>([])
  const [keywords, setKeywords] = useState<string[]>([])
  const [removedCount, setRemovedCount] = useState(0)
  const [page, setPage] = useState(1)
  const [importing, setImporting] = useState(false)
  const [showRaw, setShowRaw] = useState(false)
  const [error, setError] = useState('')
  const [success, setSuccess] = useState('')
  const [fileName, setFileName] = useState('')
  const fileRef = useRef<HTMLInputElement>(null)

  const columns = rawLeads.length > 0 ? Object.keys(rawLeads[0]) : []
  const totalPages = Math.max(1, Math.ceil(displayLeads.length / PAGE_SIZE))
  const pageLeads = displayLeads.slice((page - 1) * PAGE_SIZE, page * PAGE_SIZE)

  function handleFileUpload(e: React.ChangeEvent<HTMLInputElement>) {
    setError('')
    setSuccess('')
    setKeywords([])
    setRemovedCount(0)
    setPage(1)

    const file = e.target.files?.[0]
    if (!file) return

    setFileName(file.name)
    const reader = new FileReader()
    reader.onload = (evt) => {
      try {
        const parsed = JSON.parse(evt.target?.result as string)
        if (!Array.isArray(parsed)) {
          setError('JSON must be an array of objects')
          return
        }
        setRawLeads(parsed)
        setDisplayLeads(parsed)
      } catch {
        setError('Invalid JSON file')
      }
    }
    reader.readAsText(file)
  }

  function handleClean() {
    setError('')
    setSuccess('')
    if (keywords.length === 0) return

    const { kept, removed } = removeByKeywords(rawLeads, keywords)
    setDisplayLeads(kept)
    setRemovedCount(removed.length)
    setPage(1)
  }

  async function handleImport() {
    setError('')
    setSuccess('')

    if (!city.trim()) {
      setError('Please enter a City Name before importing.')
      return
    }

    setImporting(true)

    try {
      const mapped = mapToOutreachSchema(displayLeads, city)
      let toInsert: OutreachLead[]
      let skipped = 0

      if (isPlaceholder) {
        toInsert = mapped
      } else {
        const result = await dedupByPhoneOrUrl(mapped)
        toInsert = result.deduped
        skipped = result.skipped
      }

      if (toInsert.length === 0) {
        setSuccess('No new leads to import (all duplicates).')
        setImporting(false)
        return
      }

      if (isPlaceholder) {
        const stored = localStorage.getItem('mock_leads')
        const existing = stored ? JSON.parse(stored) : []
        localStorage.setItem('mock_leads', JSON.stringify([...existing, ...toInsert]))
        setSuccess(`Imported ${toInsert.length} leads under "${city.trim()}" (mock mode).`)
      } else {
        const { error: insertError } = await supabase.from('leads').insert(toInsert)
        if (insertError) {
          setError(`Import failed: ${insertError.message}`)
        } else {
          const parts = [`Imported ${toInsert.length} leads under "${city.trim()}"`]
          if (skipped > 0) parts.push(`${skipped} skipped (duplicates)`)
          setSuccess(parts.join('. ') + '.')
          // Reset view
          setRawLeads([])
          setDisplayLeads([])
          setFileName('')
          setCity('')
          setKeywords([])
          setRemovedCount(0)
        }
      }
    } catch (err) {
      setError(`Import failed: ${err instanceof Error ? err.message : 'Unknown error'}`)
    }

    setImporting(false)
  }

  return (
    <div className={styles.container}>
      <h1 className={styles.title}>Lead Scrape & Clean</h1>
      <p className={styles.subtitle}>Upload scraped JSON leads, filter out trash by keywords, and import to a specific city.</p>

      <div className={styles.card}>
        <div className={styles.fieldGroup}>
          <div>
            <label className={styles.label} htmlFor="city-input">City Name</label>
            <input
              id="city-input"
              className={styles.input}
              type="text"
              placeholder="e.g. Patna"
              value={city}
              onChange={(e) => setCity(e.target.value)}
            />
          </div>

          <div>
            <label className={styles.label}>JSON File (APIFY Google Maps export)</label>
            <div
              className={`${styles.fileArea} ${fileName ? styles.fileAreaActive : ''}`}
              onClick={() => fileRef.current?.click()}
            >
              <input
                ref={fileRef}
                type="file"
                accept=".json"
                style={{ display: 'none' }}
                onChange={handleFileUpload}
              />
              {fileName ? (
                <p className={styles.fileAreaText}>
                  <span className={styles.fileAreaBold}>✓ {fileName}</span>
                  <br />Click to change file
                </p>
              ) : (
                <p className={styles.fileAreaText}>
                  <span className={styles.fileAreaBold}>Click to upload</span> JSON file containing raw scraped leads
                </p>
              )}
            </div>
          </div>
        </div>

        {rawLeads.length > 0 && (
          <div className={styles.keywordSection}>
            <div className={styles.keywordInput}>
              <label className={styles.label}>Filter out trash keywords (matches name case-insensitively)</label>
              <ChipInput
                keywords={keywords}
                onChange={setKeywords}
                placeholder="Type trash keyword and press Enter..."
              />
            </div>
            <button
              className={styles.cleanBtn}
              onClick={handleClean}
              disabled={keywords.length === 0}
              style={{ marginTop: '22px' }}
            >
              Clean
            </button>
          </div>
        )}
      </div>

      {error && <div className={styles.errorBanner}>{error}</div>}
      {success && <div className={styles.successBanner}>{success}</div>}

      {rawLeads.length > 0 && (
        <>
          <div className={styles.statsGrid}>
            <div className={styles.statsCard}>
              <div className={styles.statsValue}>{rawLeads.length}</div>
              <div className={styles.statsLabel}>Total Loaded</div>
            </div>
            <div className={`${styles.statsCard} ${styles.statsCardRemoved}`}>
              <div className={styles.statsValue}>{removedCount}</div>
              <div className={styles.statsLabel}>Removed (Trash)</div>
            </div>
            <div className={`${styles.statsCard} ${styles.statsCardKept}`}>
              <div className={styles.statsValue}>{displayLeads.length}</div>
              <div className={styles.statsLabel}>Remaining</div>
            </div>
          </div>

          <div className={styles.tableCard}>
            <div className={styles.tableHeaderRow}>
              <div className={styles.previewTitle}>Preview — {displayLeads.length} leads parsed</div>
              <div className={styles.toggleRow}>
                <input
                  id="show-raw"
                  type="checkbox"
                  className={styles.toggleCheckbox}
                  checked={showRaw}
                  onChange={(e) => setShowRaw(e.target.checked)}
                />
                <label htmlFor="show-raw" className={styles.toggleLabel}>Show Raw JSON Columns</label>
              </div>
            </div>

            <div className={styles.tableWrap}>
              <table className={styles.table}>
                <thead>
                  <tr>
                    <th>#</th>
                    {showRaw ? (
                      columns.map((col) => <th key={col}>{col}</th>)
                    ) : (
                      <>
                        <th>Name</th>
                        <th>Phone</th>
                        <th>Google Maps Link</th>
                        <th>Website</th>
                      </>
                    )}
                  </tr>
                </thead>
                <tbody>
                  {pageLeads.length === 0 ? (
                    <tr>
                      <td colSpan={showRaw ? columns.length + 1 : 5} className={styles.emptyState}>
                        No leads to display.
                      </td>
                    </tr>
                  ) : (
                    pageLeads.map((lead, idx) => {
                      const absoluteIndex = (page - 1) * PAGE_SIZE + idx + 1
                      if (showRaw) {
                        return (
                          <tr key={absoluteIndex}>
                            <td>{absoluteIndex}</td>
                            {columns.map((col) => (
                              <td key={col} title={String(lead[col] ?? '')}>
                                {String(lead[col] ?? '')}
                              </td>
                            ))}
                          </tr>
                        )
                      } else {
                        const name = (lead.title ?? lead.name ?? '—') as string
                        const phone = (lead.phone ?? '—') as string
                        const mapsUrl = (lead.url ?? lead.google_maps_url ?? '') as string
                        const website = (lead.website ?? '—') as string

                        return (
                          <tr key={absoluteIndex}>
                            <td>{absoluteIndex}</td>
                            <td title={name}>{name}</td>
                            <td>{phone}</td>
                            <td>
                              {mapsUrl ? (
                                <a
                                  href={mapsUrl}
                                  target="_blank"
                                  rel="noopener noreferrer"
                                  className={styles.link}
                                >
                                  Google Maps 🌐
                                </a>
                              ) : (
                                '—'
                              )}
                            </td>
                            <td title={website}>
                              {website && website !== '—' ? (
                                <a
                                  href={website.startsWith('http') ? website : `http://${website}`}
                                  target="_blank"
                                  rel="noopener noreferrer"
                                  className={styles.link}
                                >
                                  {website}
                                </a>
                              ) : (
                                '—'
                              )}
                            </td>
                          </tr>
                        )
                      }
                    })
                  )}
                </tbody>
              </table>
            </div>

            {totalPages > 1 && (
              <Pagination
                page={page}
                totalPages={totalPages}
                onPrev={() => setPage((p) => p - 1)}
                onNext={() => setPage((p) => p + 1)}
              />
            )}

            <div className={styles.btnRow}>
              <button
                className={styles.btnPrimary}
                onClick={handleImport}
                disabled={displayLeads.length === 0 || importing}
              >
                {importing ? 'Importing...' : 'Format & Import to Supabase'}
              </button>
              <button
                className={styles.btnSecondary}
                onClick={() => {
                  setRawLeads([])
                  setDisplayLeads([])
                  setFileName('')
                  setKeywords([])
                  setRemovedCount(0)
                  setError('')
                  setSuccess('')
                }}
                disabled={importing}
              >
                Reset
              </button>
            </div>
          </div>
        </>
      )}
    </div>
  )
}
