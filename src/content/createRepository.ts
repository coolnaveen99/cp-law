import type { ContentRepository } from './ContentRepository'
import { LocalContentRepository } from './LocalContentRepository'
import { RemoteContentRepository } from './RemoteContentRepository'

export function createRepository(): ContentRepository {
  const backend = import.meta.env.VITE_CONTENT_BACKEND
  // If explicitly requested local, use LocalContentRepository (e.g. unit tests or offline dev)
  if (backend === 'local') {
    return new LocalContentRepository()
  }
  // In the browser, default to RemoteContentRepository so it reads from /api (Supabase)
  if (typeof window !== 'undefined' || backend === 'remote') {
    return new RemoteContentRepository()
  }
  return new LocalContentRepository()
}
