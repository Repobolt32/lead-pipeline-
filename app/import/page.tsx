'use client'

import { useState, useRef } from 'react'
import { supabase } from '@/lib/supabase'
import { parseCSV, RawLead } from '@/lib/parseLeads'
import styles from './page.module.css'

export default function ImportPage() {
  const [city, setCity] = useState('')
  const [leads, setLeads] = useState<RawLead[]>([])
  const [fileName, setFileName] = useState('')
  const [loading, setLoading] = useState(false)
  const [result, setResult] = useState<{ inserted: number; skipped: number } | null>(null)
  const [error, setError] = useState('')
  const fileInputRef = useRef<HTMLInputElement>(null)

  function handleFile(file: File) {
    if (!city.trim()) {
      setError('Please enter a city name before uploading.')
      return
    }
    setError('')
    setResult(null)
    const reader = new FileReader()
    reader.onload = (e) => {
      const text = e.target?.result as string
      try {
        const parsed = parseCSV(text, city)
        setLeads(parsed)
        setFileName(file.name)
      } catch (err) {
        const msg = err instanceof Error ? err.message : String(err)
        setError(`Failed to parse CSV: ${msg}`)
      }
    }
    reader.readAsText(file)
  }

  function handleDrop(e: React.DragEvent) {
    e.preventDefault()
    const file = e.dataTransfer.files[0]
    if (file) handleFile(file)
  }

  async function handleImport() {
    if (!leads.length) return
    setLoading(true)
    setError('')
    setResult(null)

    try {
      // Fetch existing phones for this city to dedup
      const { data: existing, error: fetchError } = await supabase
        .from('leads')
        .select('phone')
        .eq('city', city.trim())

      if (fetchError) {
        setError(`Failed to check existing leads: ${fetchError.message}`)
        setLoading(false)
        return
      }

      const existingPhones = new Set((existing || []).map((r: { phone: string }) => r.phone))

      const toInsert = leads.filter((l) => {
        // If there's no phone, we insert it anyway. If there is a phone, skip duplicate.
        if (!l.phone) return true
        return !existingPhones.has(l.phone)
      })

      const skipped = leads.length - toInsert.length

      if (toInsert.length > 0) {
        const { error: insertError } = await supabase.from('leads').insert(toInsert)
        if (insertError) {
          setError(`Insert failed: ${insertError.message}`)
          setLoading(false)
          return
        }
      }

      setResult({ inserted: toInsert.length, skipped })
      setLeads([])
      setFileName('')
      setCity('')
    } catch (err) {
      const msg = err instanceof Error ? err.message : String(err)
      setError(`An unexpected error occurred: ${msg}`)
    } finally {
      setLoading(false)
    }
  }

  return (
    <div className={styles.container}>
      <h1 className={styles.title}>Import Leads</h1>
      <p className={styles.subtitle}>Upload an Apify Google Maps CSV export to add leads to a city.</p>

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
            <label className={styles.label}>CSV File (from Apify)</label>
            <div
              className={`${styles.fileArea} ${fileName ? styles.fileAreaActive : ''}`}
              onDrop={handleDrop}
              onDragOver={(e) => e.preventDefault()}
              onClick={() => fileInputRef.current?.click()}
            >
              <input
                ref={fileInputRef}
                type="file"
                accept=".csv"
                style={{ display: 'none' }}
                onChange={(e) => {
                  const file = e.target.files?.[0]
                  if (file) handleFile(file)
                }}
              />
              {fileName ? (
                <p className={styles.fileAreaText}>
                  <span className={styles.fileAreaBold}>✓ {fileName}</span>
                  <br />Click to change file
                </p>
              ) : (
                <p className={styles.fileAreaText}>
                  <span className={styles.fileAreaBold}>Click to upload</span> or drag & drop
                  <br />CSV file from Apify export
                </p>
              )}
            </div>
          </div>
        </div>
      </div>

      {error && <div className={styles.errorBanner}>{error}</div>}
      {result && (
        <div className={styles.successBanner}>
          ✓ Imported {result.inserted} leads · {result.skipped} duplicates skipped
        </div>
      )}

      {leads.length > 0 && (
        <div className={styles.card}>
          <p className={styles.previewTitle}>Preview — {leads.length} leads parsed</p>
          <p className={styles.previewInfo}>Review before importing. Duplicates (same phone in this city) will be skipped automatically.</p>
          <div className={styles.tableWrap}>
            <table className={styles.table}>
              <thead>
                <tr>
                  <th>Name</th>
                  <th>Phone</th>
                  <th>Address</th>
                  <th>Rating</th>
                  <th>Website</th>
                </tr>
              </thead>
              <tbody>
                {leads.map((lead, i) => (
                  <tr key={i}>
                    <td title={lead.name}>{lead.name}</td>
                    <td>{lead.phone || '—'}</td>
                    <td title={lead.address}>{lead.address || '—'}</td>
                    <td>{lead.rating ?? '—'}</td>
                    <td title={lead.website}>{lead.website || '—'}</td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
          <div className={styles.btnRow}>
            <button
              id="import-btn"
              className={styles.btnPrimary}
              onClick={handleImport}
              disabled={loading}
            >
              {loading ? 'Importing...' : `Import ${leads.length} Leads`}
            </button>
            <button
              className={styles.btnSecondary}
              onClick={() => { setLeads([]); setFileName('') }}
            >
              Cancel
            </button>
          </div>
        </div>
      )}
    </div>
  )
}
