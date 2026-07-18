// Update VIDEO_LINK with your Loom URL before going live
export const VIDEO_LINK = 'https://www.youtube.com/watch?v=gxqY6Hh4vTo'

export const WHATSAPP_MESSAGE = `Hi! This is the demo video for Restoloop: your restaurant growth partner.

${VIDEO_LINK}

Would love to know your thoughts!`

// Apify Google Maps Scraper standard output column names → our DB columns
export const APIFY_COLUMN_MAP: Record<string, string> = {
  title: 'name',
  phone: 'phone',
  url: 'google_maps_url',
  address: 'address',
  totalScore: 'rating',
  website: 'website',
}

// Row background colors by call_status value
export const CALL_STATUS_COLORS: Record<string, string> = {
  pending:    '#FFFFFF', // white   — not yet called
  called:     '#F0FDF4', // green   — call done
  call_later: '#FFF7ED', // orange  — follow up
  no_answer:  '#F3F4F6', // grey    — dead / no response
}

// Badge colors for the call status select element
export const CALL_STATUS_BADGE: Record<string, { bg: string; color: string }> = {
  pending:    { bg: '#FDE68A', color: '#92400E' },
  called:     { bg: '#6EE7B7', color: '#065F46' },
  call_later: { bg: '#FDBA74', color: '#9A3412' },
  no_answer:  { bg: '#D1D5DB', color: '#374151' },
}

export const CALL_STATUS_OPTIONS = ['pending', 'called', 'call_later', 'no_answer'] as const
export const SALE_STATUS_OPTIONS = ['pending', 'free_trial', 'proceed', 'rejected'] as const

export type CallStatus = typeof CALL_STATUS_OPTIONS[number]
export type SaleStatus = typeof SALE_STATUS_OPTIONS[number]
