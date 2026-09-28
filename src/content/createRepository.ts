import type { ContentRepository } from './ContentRepository'
import { LocalContentRepository } from './LocalContentRepository'
import { RemoteContentRepository } from './RemoteContentRepository'

import { SupabaseContentRepository } from './SupabaseContentRepository'

export function createRepository(): ContentRepository {
  const backend = import.meta.env.VITE_CONTENT_BACKEND
  // If explicitly requested local, use LocalContentRepository (e.g. unit tests or offline dev)
  if (backend === 'local') {
    return new LocalContentRepository()
  }

  // If public Supabase credentials are configured in Vite, query Supabase directly from browser
  const supabaseUrl = import.meta.env.VITE_SUPABASE_URL
  const supabaseAnonKey = import.meta.env.VITE_SUPABASE_ANON_KEY
  if (supabaseUrl && supabaseAnonKey) {
    return new SupabaseContentRepository(supabaseUrl, supabaseAnonKey)
  }

  // Otherwise use the /api backend with local fallback
  if (typeof window !== 'undefined' || backend === 'remote') {
    return new RemoteContentRepository()
  }
  return new LocalContentRepository()
}
