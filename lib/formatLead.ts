import { APIFY_COLUMN_MAP } from './constants'
import { supabase } from './supabase'

export function removeByKeywords(
  leads: Record<string, unknown>[],
  keywords: string[]
): { kept: Record<string, unknown>[]; removed: Record<string, unknown>[] } {
  if (keywords.length === 0) return { kept: leads, removed: [] }

  const lowerKeywords = keywords.map(k => k.toLowerCase())

  const kept: Record<string, unknown>[] = []
  const removed: Record<string, unknown>[] = []

  for (const lead of leads) {
    let matched = false

    for (const value of Object.values(lead)) {
      if (typeof value === 'string') {
        const lowerVal = value.toLowerCase()
        if (lowerKeywords.some(kw => lowerVal.includes(kw))) {
          matched = true
          break
        }
      } else if (Array.isArray(value)) {
        const hasMatch = value.some(item => {
          if (typeof item === 'string') {
            const lowerItem = item.toLowerCase()
            return lowerKeywords.some(kw => lowerItem.includes(kw))
          }
          return false
        })
        if (hasMatch) {
          matched = true
          break
        }
      } else if (value && typeof value === 'object') {
        const hasMatch = Object.values(value).some(subVal => {
          if (typeof subVal === 'string') {
            const lowerSub = subVal.toLowerCase()
            return lowerKeywords.some(kw => lowerSub.includes(kw))
          }
          return false
        })
        if (hasMatch) {
          matched = true
          break
        }
      }
    }

    if (matched) {
      removed.push(lead)
    } else {
      kept.push(lead)
    }
  }

  return { kept, removed }
}

export interface OutreachLead {
  id: string
  name: string
  phone: string
  whatsapp_number: string
  google_maps_url: string
  address: string
  rating: number | null
  website: string
  city: string
  call_status: string
  sale_status: string
  notes: string
}

function cleanPhone(raw: string): string {
  if (!raw) return ''
  return raw.replace(/[^\d+]/g, '')
}

export function mapToOutreachSchema(rawLeads: Record<string, unknown>[], city: string): OutreachLead[] {
  return rawLeads.map((raw) => {
    const mapped: Record<string, unknown> = {}
    for (const [fromKey, toKey] of Object.entries(APIFY_COLUMN_MAP)) {
      mapped[toKey] = raw[fromKey] ?? ''
    }
    const phone = cleanPhone((mapped.phone ?? raw.phone ?? '') as string)
    return {
      id: crypto.randomUUID(),
      name: (mapped.name ?? raw.name ?? '') as string,
      phone,
      whatsapp_number: phone,
      google_maps_url: (mapped.google_maps_url ?? raw.google_maps_url ?? '') as string,
      address: (mapped.address ?? raw.address ?? '') as string,
      rating: mapped.rating ? Number(mapped.rating) : null,
      website: (mapped.website ?? raw.website ?? '') as string,
      city: city.trim(),
      call_status: 'pending',
      sale_status: 'pending',
      notes: '',
    }
  })
}

export async function dedupByPhoneOrUrl(
  leads: OutreachLead[]
): Promise<{ deduped: OutreachLead[]; skipped: number }> {
  const phones = leads.map(l => l.phone).filter(Boolean)
  const urls = leads.map(l => l.google_maps_url).filter(Boolean)
  const matchedPhones = new Set<string>()
  const matchedUrls = new Set<string>()

  if (phones.length > 0) {
    const { data: phoneMatches } = await supabase
      .from('leads')
      .select('phone')
      .in('phone', phones)
    phoneMatches?.forEach(r => { if (r.phone) matchedPhones.add(r.phone) })
  }

  if (urls.length > 0) {
    const { data: urlMatches } = await supabase
      .from('leads')
      .select('google_maps_url')
      .in('google_maps_url', urls)
    urlMatches?.forEach(r => { if (r.google_maps_url) matchedUrls.add(r.google_maps_url) })
  }

  const seenPhones = new Set<string>()
  const seenUrls = new Set<string>()

  const deduped = leads.filter((l) => {
    // Check if it already exists in the database
    if (matchedPhones.has(l.phone) || matchedUrls.has(l.google_maps_url)) {
      return false
    }
    // Check if it is a duplicate within the uploaded set itself
    if (l.phone && seenPhones.has(l.phone)) {
      return false
    }
    if (l.google_maps_url && seenUrls.has(l.google_maps_url)) {
      return false
    }

    if (l.phone) seenPhones.add(l.phone)
    if (l.google_maps_url) seenUrls.add(l.google_maps_url)
    return true
  })

  const skipped = leads.length - deduped.length

  return { deduped, skipped }
}
