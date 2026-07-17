'use client'

import { useState, useEffect } from 'react'
import { supabase, isPlaceholder } from '@/lib/supabase'
import LeadRow from '@/components/LeadRow'
import Pagination from '@/components/Pagination'
import { CallStatus, SaleStatus } from '@/lib/constants'
import styles from './page.module.css'

const PAGE_SIZE = 10

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

const MOCK_LEADS: Lead[] = [
  {
    id: '1',
    name: 'Pizza Palace (Pending)',
    phone: '+15550192',
    whatsapp_number: '+15550192',
    google_maps_url: 'https://maps.google.com/?cid=111',
    call_status: 'pending',
    sale_status: 'pending',
    notes: 'Freshly imported lead, not yet called.'
  },
  {
    id: '2',
    name: 'Burger Bistro (Called & Free Trial)',
    phone: '+15550193',
    whatsapp_number: '+15550193',
    google_maps_url: 'https://maps.google.com/?cid=222',
    call_status: 'called',
    sale_status: 'free_trial',
    notes: 'Had a call, agreed to start a 14-day free trial.'
  },
  {
    id: '3',
    name: 'Sushi Spot (Call Later & Proceed)',
    phone: '+15550194',
    whatsapp_number: '+15550194',
    google_maps_url: 'https://maps.google.com/?cid=333',
    call_status: 'call_later',
    sale_status: 'proceed',
    notes: 'Busy right now, asked to call back next Tuesday.'
  },
  {
    id: '4',
    name: 'Taco Town (No Answer & Rejected)',
    phone: '+15550195',
    whatsapp_number: '+15550195',
    google_maps_url: 'https://maps.google.com/?cid=444',
    call_status: 'no_answer',
    sale_status: 'rejected',
    notes: 'No response after 3 call attempts. Marking as dead lead.'
  },
  {
    id: '5',
    name: 'Pasta Place (Called & Proceed)',
    phone: '+15550196',
    whatsapp_number: '+15550196',
    google_maps_url: 'https://maps.google.com/?cid=555',
    call_status: 'called',
    sale_status: 'proceed',
    notes: 'Highly interested! Proceeding to setup implementation.'
  }
]

export default function OutreachPage() {
  const [cities, setCities] = useState<string[]>([])
  const [selectedCity, setSelectedCity] = useState<string>('')
  const [leads, setLeads] = useState<Lead[]>([])
  const [totalCount, setTotalCount] = useState(0)
  const [page, setPage] = useState(1)
  const [loading, setLoading] = useState(false)

  const totalPages = Math.max(1, Math.ceil(totalCount / PAGE_SIZE))

  // Load distinct cities once on mount
  useEffect(() => {
    async function loadCities() {
      if (isPlaceholder) {
        setCities(['TestCity (Mock)'])
        setSelectedCity('TestCity (Mock)')
        return
      }
      const { data } = await supabase
        .from('leads')
        .select('city')
        .order('city')
      if (data) {
        const unique = Array.from(new Set(data.map((r: { city: string }) => r.city)))
        setCities(unique)
        if (unique.length > 0) {
          setSelectedCity(unique[0])
        }
      }
    }
    loadCities()
  }, [])

  // Load leads for selected city + page
  useEffect(() => {
    if (!selectedCity) return

    if (isPlaceholder) {
      const stored = localStorage.getItem('mock_leads')
      let list = MOCK_LEADS
      if (stored) {
        list = JSON.parse(stored)
      } else {
        localStorage.setItem('mock_leads', JSON.stringify(MOCK_LEADS))
      }
      Promise.resolve().then(() => {
        setLeads(list)
        setTotalCount(list.length)
      })
      return
    }


    let cancelled = false

    const from = (page - 1) * PAGE_SIZE
    const to = from + PAGE_SIZE - 1

    const query = supabase
      .from('leads')
      .select('id,name,phone,whatsapp_number,google_maps_url,call_status,sale_status,notes', { count: 'exact' })
      .eq('city', selectedCity)
      .order('created_at', { ascending: true })
      .range(from, to)

    Promise.resolve(true)
      .then(() => { if (!cancelled) setLoading(true); return query })
      .then(({ data, count }) => {
        if (cancelled) return
        setLeads((data as Lead[]) || [])
        setTotalCount(count || 0)
        setLoading(false)
      })

    return () => { cancelled = true }
  }, [selectedCity, page])


  // Reset to page 1 when city changes
  function handleCityChange(e: React.ChangeEvent<HTMLSelectElement>) {
    setSelectedCity(e.target.value)
    setPage(1)
  }

  return (
    <div className={styles.container}>
      <div className={styles.header}>
        <h1 className={styles.title}>Outreach</h1>
        <div className={styles.controls}>
          <select
            id="city-select"
            className={styles.citySelect}
            value={selectedCity}
            onChange={handleCityChange}
          >
            {cities.length === 0 && <option value="">No cities yet</option>}
            {cities.map((c) => (
              <option key={c} value={c}>{c}</option>
            ))}
          </select>
          {totalCount > 0 && (
            <span className={styles.countBadge}>{totalCount} leads</span>
          )}
        </div>
      </div>

      <div className={styles.tableCard}>
        <div className={styles.tableWrap}>
          <table className={styles.table}>
            <thead>
              <tr>
                <th>Name</th>
                <th>Phone</th>
                <th>Maps</th>
                <th>Call Status</th>
                <th>WhatsApp</th>
                <th>Sale Status</th>
                <th>Notes</th>
              </tr>
            </thead>
            <tbody>
              {loading ? (
                <tr>
                  <td colSpan={7} className={styles.loadingState}>Loading leads...</td>
                </tr>
              ) : leads.length === 0 ? (
                <tr>
                  <td colSpan={7} className={styles.emptyState}>
                    No leads found for {selectedCity || 'this city'}.<br />
                    Import leads on the Import page.
                  </td>
                </tr>
              ) : (
                leads.map((lead) => (
                  <LeadRow key={lead.id} lead={lead} />
                ))
              )}
            </tbody>
          </table>
        </div>
      </div>

      {totalPages > 1 && (
        <Pagination
          page={page}
          totalPages={totalPages}
          onPrev={() => setPage((p) => p - 1)}
          onNext={() => setPage((p) => p + 1)}
        />
      )}
    </div>
  )
}
