import Papa from 'papaparse'
import { APIFY_COLUMN_MAP } from './constants'

export interface RawLead {
  name: string
  phone: string
  whatsapp_number: string
  google_maps_url: string
  address: string
  rating: number | null
  website: string
  instagram: string
  facebook: string
  city: string
  call_status: string
  sale_status: string
  notes: string
}

function cleanPhone(raw: string): string {
  if (!raw) return ''
  // Keep digits and leading +
  const stripped = raw.replace(/[^\d+]/g, '')
  return stripped
}

export function parseCSV(csvText: string, city: string): RawLead[] {
  const result = Papa.parse(csvText, {
    header: true,
    skipEmptyLines: true,
  })

  const rows = result.data as Record<string, string>[]

  return rows.map((row) => {
    const mapped: Record<string, string> = {}
    for (const [apifyCol, dbCol] of Object.entries(APIFY_COLUMN_MAP)) {
      mapped[dbCol] = (row[apifyCol] || '').trim()
    }

    const phone = cleanPhone(mapped.phone || '')

    return {
      name: mapped.name || '',
      phone,
      whatsapp_number: phone,
      google_maps_url: mapped.google_maps_url || '',
      address: mapped.address || '',
      rating: mapped.rating ? parseFloat(mapped.rating) : null,
      website: mapped.website || '',
      instagram: '',
      facebook: '',
      city: city.trim(),
      call_status: 'pending',
      sale_status: 'pending',
      notes: '',
    }
  }).filter((lead) => lead.name) // drop empty rows
}
