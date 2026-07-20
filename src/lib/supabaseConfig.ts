export type SupabaseRuntimeConfig = {
  url: string
  anonKey: string
}

let cached: SupabaseRuntimeConfig | null = null

export async function loadSupabaseConfig(): Promise<SupabaseRuntimeConfig> {
  if (cached) return cached
  const fromEnv = {
    url: (import.meta.env.VITE_SUPABASE_URL as string | undefined)?.trim() ?? '',
    anonKey: (import.meta.env.VITE_SUPABASE_ANON_KEY as string | undefined)?.trim() ?? '',
  }
  if (fromEnv.url && fromEnv.anonKey) {
    cached = fromEnv
    return cached
  }
  try {
    const res = await fetch(`/supabase-config.json?t=${Date.now()}`, { cache: 'no-store' })
    if (res.ok) {
      const json = (await res.json()) as Partial<SupabaseRuntimeConfig>
      cached = {
        url: (json.url ?? '').trim(),
        anonKey: (json.anonKey ?? '').trim(),
      }
      return cached
    }
  } catch {
    /* ignore */
  }
  cached = { url: '', anonKey: '' }
  return cached
}

export function isSupabaseConfigured(cfg: SupabaseRuntimeConfig) {
  return Boolean(cfg.url && cfg.anonKey)
}
