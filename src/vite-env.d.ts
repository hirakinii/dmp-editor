/// <reference types="vite/client" />
declare const __APP_VERSION__: string
declare const DMP_EDITOR_BASE: string
// declare const KAKEN_APP_ID: string

interface ImportMetaEnv {
  readonly VITE_USE_GRDM_DEV_ENV?: string
  readonly VITE_KAKEN_APP_ID?: string
}

interface ImportMeta {
  readonly env: ImportMetaEnv
}

declare module "*.md?raw" {
  const content: string
  export default content
}
