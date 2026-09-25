import { LocalContentRepository } from './LocalContentRepository'
import type { ContentRepository } from './ContentRepository'

/**
 * Server handlers start on the local adapter.
 * Wire Supabase here later without changing route shapes.
 */
export function getServerRepository(): ContentRepository {
  return new LocalContentRepository()
}
