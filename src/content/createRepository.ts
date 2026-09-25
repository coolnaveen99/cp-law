import type { ContentRepository } from './ContentRepository'
import { LocalContentRepository } from './LocalContentRepository'
import { RemoteContentRepository } from './RemoteContentRepository'

export function createRepository(): ContentRepository {
  const backend = import.meta.env.VITE_CONTENT_BACKEND ?? 'local'
  if (backend === 'remote') {
    return new RemoteContentRepository()
  }
  return new LocalContentRepository()
}
