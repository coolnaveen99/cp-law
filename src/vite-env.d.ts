/// <reference types="vite/client" />

interface ImportMetaEnv {
  readonly VITE_CONTENT_BACKEND?: string
}

interface ImportMeta {
  readonly env: ImportMetaEnv
}
