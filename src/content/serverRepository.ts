import { LocalContentRepository } from './LocalContentRepository'
import { SupabaseContentRepository } from './SupabaseContentRepository'
import type { ContentRepository } from './ContentRepository'

/**
 * Server repository returns Supabase repository when SUPABASE_URL and
 * SUPABASE_SERVICE_ROLE_KEY are configured, falling back to local fixtures.
 */
export function getServerRepository(): ContentRepository {
  const url = process.env.SUPABASE_URL
  const key = process.env.SUPABASE_SERVICE_ROLE_KEY

  if (url && key) {
    return new SupabaseContentRepository(url, key)
  }

  return new LocalContentRepository()
}
