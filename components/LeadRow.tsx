'use client'

import { useState } from 'react'
import { supabase } from '@/lib/supabase'
import {
  CALL_STATUS_COLORS,
  CALL_STATUS_OPTIONS,
  WHATSAPP_MESSAGE,
  CallStatus,
  SaleStatus,
} from '@/lib/constants'
import styles from './LeadRow.module.css'

interface Lead {
  id: string
  name: string
  phone: string
  whatsapp_number: string
  google_maps_url: string
  call_status: CallStatus
  sale_status: SaleStatus
  notes: string
}

const SALE_PILL_COLORS: Record<SaleStatus, { bg: string; color: string }> = {
  pending:    { bg: '#F3F4F6', color: '#374151' },
  free_trial: { bg: '#DBEAFE', color: '#1D4ED8' },
  proceed:    { bg: '#D1FAE5', color: '#065F46' },
  rejected:   { bg: '#FEE2E2', color: '#991B1B' },
}

const SALE_CYCLE: SaleStatus[] = ['pending', 'free_trial', 'proceed', 'rejected']

interface LeadRowProps {
  lead: Lead
}

export default function LeadRow({ lead: initialLead }: LeadRowProps) {
  const [lead, setLead] = useState<Lead>(initialLead)

  function updateLocal(patch: Partial<Lead>) {
    setLead((prev) => ({ ...prev, ...patch }))
  }

  async function updateDB(patch: Partial<Lead>) {
    await supabase.from('leads').update(patch).eq('id', lead.id)
  }

  function handleCallStatus(e: React.ChangeEvent<HTMLSelectElement>) {
    const val = e.target.value as CallStatus
    updateLocal({ call_status: val })
    updateDB({ call_status: val })
  }

  function handleSaleCycle() {
    const idx = SALE_CYCLE.indexOf(lead.sale_status)
    const next = SALE_CYCLE[(idx + 1) % SALE_CYCLE.length]
    updateLocal({ sale_status: next })
    updateDB({ sale_status: next })
  }

  function handleWaNumberBlur(e: React.FocusEvent<HTMLInputElement>) {
    const val = e.target.value.trim()
    updateLocal({ whatsapp_number: val })
    updateDB({ whatsapp_number: val })
  }

  function handleNotesBlur(e: React.FocusEvent<HTMLTextAreaElement>) {
    const val = e.target.value
    updateLocal({ notes: val })
    updateDB({ notes: val })
  }

  function handleWhatsApp() {
    const number = lead.whatsapp_number || lead.phone
    const text = encodeURIComponent(WHATSAPP_MESSAGE)
    window.open(`https://wa.me/${number.replace(/\D/g, '')}?text=${text}`, '_blank')
  }

  const rowBg = CALL_STATUS_COLORS[lead.call_status] ?? '#FFFFFF'
  const pillStyle = SALE_PILL_COLORS[lead.sale_status]

  return (
    <tr className={styles.row} style={{ background: rowBg }}>
      {/* Name */}
      <td className={`${styles.td} ${styles.name}`} title={lead.name}>{lead.name}</td>

      {/* Phone */}
      <td className={`${styles.td} ${styles.phone}`}>
        <a
          className={styles.phoneLink}
          href={`tel:${lead.phone}`}
          id={`phone-${lead.id}`}
        >
          📞 {lead.phone}
        </a>
      </td>

      {/* Maps */}
      <td className={styles.td}>
        <button
          className={styles.mapsBtn}
          id={`maps-${lead.id}`}
          onClick={() => window.open(lead.google_maps_url, '_blank')}
          disabled={!lead.google_maps_url}
        >
          📍 View
        </button>
      </td>

      {/* Call Status */}
      <td className={styles.td}>
        <select
          className={styles.statusSelect}
          value={lead.call_status}
          onChange={handleCallStatus}
          id={`call-status-${lead.id}`}
        >
          {CALL_STATUS_OPTIONS.map((s) => (
            <option key={s} value={s}>
              {s.replace(/_/g, ' ')}
            </option>
          ))}
        </select>
      </td>

      {/* WhatsApp */}
      <td className={styles.td}>
        <div className={styles.whatsappCell}>
          <input
            className={styles.waInput}
            defaultValue={lead.whatsapp_number || lead.phone}
            onBlur={handleWaNumberBlur}
            placeholder="WA number"
            id={`wa-number-${lead.id}`}
          />
          <button
            className={styles.waBtn}
            onClick={handleWhatsApp}
            id={`wa-btn-${lead.id}`}
          >
            WA
          </button>
        </div>
      </td>

      {/* Sale Status */}
      <td className={styles.td}>
        <button
          className={styles.salePill}
          style={{ background: pillStyle.bg, color: pillStyle.color }}
          onClick={handleSaleCycle}
          id={`sale-status-${lead.id}`}
          title="Click to cycle status"
        >
          {lead.sale_status.replace(/_/g, ' ')}
        </button>
      </td>

      {/* Notes */}
      <td className={styles.td}>
        <textarea
          className={styles.notesInput}
          defaultValue={lead.notes}
          onBlur={handleNotesBlur}
          placeholder="Add note..."
          rows={1}
          id={`notes-${lead.id}`}
        />
      </td>
    </tr>
  )
}
