import { createContext, useContext } from "react"

export type SnackbarSeverity = "success" | "error" | "info" | "warning"

export interface SnackbarContextValue {
  showSnackbar: (message: string, severity: SnackbarSeverity) => void
}

export const SnackbarContext = createContext<SnackbarContextValue | null>(null)

/**
 * Hook to access the global snackbar notification system.
 * Must be used within a SnackbarProvider.
 * @throws if used outside SnackbarProvider
 */
export function useSnackbar(): SnackbarContextValue {
  const ctx = useContext(SnackbarContext)
  if (!ctx) throw new Error("useSnackbar must be used within SnackbarProvider")
  return ctx
}
