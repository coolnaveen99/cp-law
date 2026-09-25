export interface VercelRequest {
  method?: string
  query: Record<string, string | string[] | undefined>
}

export interface VercelResponse {
  status: (code: number) => VercelResponse
  json: (body: unknown) => void
}
