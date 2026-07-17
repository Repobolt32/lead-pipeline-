import { createClient } from '@supabase/supabase-js'

const rawUrl = process.env.NEXT_PUBLIC_SUPABASE_URL || ''
const rawKey = process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY || ''

export const isPlaceholder = 
  !rawUrl || 
  !rawKey || 
  rawUrl.includes('your_supabase') || 
  rawKey.includes('your_supabase')

const supabaseUrl = rawUrl && (rawUrl.startsWith('http://') || rawUrl.startsWith('https://')) 
  ? rawUrl 
  : 'https://placeholder.supabase.co'
const supabaseAnonKey = rawKey || 'placeholder-anon-key'

export const supabase = createClient(supabaseUrl, supabaseAnonKey)

