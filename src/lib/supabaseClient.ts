import { createClient, type SupabaseClient } from '@supabase/supabase-js'
import { isSupabaseConfigured, loadSupabaseConfig } from './supabaseConfig'

let client: SupabaseClient | null = null
let initPromise: Promise<SupabaseClient | null> | null = null

export async function getSupabase(): Promise<SupabaseClient | null> {
  if (client) return client
  if (initPromise) return initPromise
  initPromise = (async () => {
    const cfg = await loadSupabaseConfig()
    if (!isSupabaseConfigured(cfg)) return null
    client = createClient(cfg.url, cfg.anonKey, {
      auth: { persistSession: false, autoRefreshToken: false },
    })
    return client
  })()
  return initPromise
}

export function supabaseReadySync() {
  return client != null
}
