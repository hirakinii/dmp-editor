import { ThemeProvider } from "@mui/material/styles"
import { QueryClient, QueryClientProvider } from "@tanstack/react-query"
import { render, screen } from "@testing-library/react"
import userEvent from "@testing-library/user-event"
import { MemoryRouter } from "react-router-dom"
import { RecoilRoot } from "recoil"
import { beforeEach, describe, expect, it, vi } from "vitest"

import AppHeader from "../../src/components/AppHeader"
import { theme } from "../../src/theme"

// --- Mocks ---

const mockNavigate = vi.fn()

vi.mock("react-router-dom", async (importOriginal) => {
  const actual = await importOriginal<typeof import("react-router-dom")>()
  return { ...actual, useNavigate: () => mockNavigate }
})

vi.mock("react-error-boundary", async (importOriginal) => {
  const original = await importOriginal<typeof import("react-error-boundary")>()
  return {
    ...original,
    useErrorBoundary: () => ({ showBoundary: vi.fn() }),
  }
})

vi.mock("@/hooks/useUser", () => ({
  useUser: () => ({ data: null, isError: false, error: null }),
}))

vi.mock("@/hooks/useSnackbar", () => ({
  useSnackbar: () => ({ showSnackbar: vi.fn() }),
}))

vi.mock("@/config", () => ({
  GRDM_CONFIG: {
    BASE_URL: "https://rdm.nii.ac.jp",
    API_BASE_URL: "https://api.rdm.nii.ac.jp/v2",
    TOKEN_SETTINGS_URL: "https://rdm.nii.ac.jp/settings/tokens",
    SUPPORT_URL: "https://support.rdm.nii.ac.jp/usermanual/Setting-06/",
  },
}))

// --- Helper ---

function renderAppHeader(props: { noAuth?: boolean } = {}) {
  const queryClient = new QueryClient({
    defaultOptions: { queries: { retry: false } },
  })
  return render(
    <MemoryRouter>
      <ThemeProvider theme={theme}>
        <RecoilRoot>
          <QueryClientProvider client={queryClient}>
            <AppHeader {...props} />
          </QueryClientProvider>
        </RecoilRoot>
      </ThemeProvider>
    </MemoryRouter>,
  )
}

// --- Tests ---

describe("AppHeader", () => {
  beforeEach(() => {
    vi.clearAllMocks()
  })

  describe("Manual navigation button", () => {
    // The button label is translated (ja: "マニュアル", en: "Manual")
    const manualButtonPattern = /マニュアル|Manual/i

    it("renders the manual icon button", () => {
      renderAppHeader()
      expect(screen.getByRole("button", { name: manualButtonPattern })).toBeInTheDocument()
    })

    it("navigates to /manual when clicked", async () => {
      const user = userEvent.setup()
      renderAppHeader()
      await user.click(screen.getByRole("button", { name: manualButtonPattern }))
      expect(mockNavigate).toHaveBeenCalledWith("/manual")
    })

    it("renders the manual button also in noAuth mode", () => {
      renderAppHeader({ noAuth: true })
      expect(screen.getByRole("button", { name: manualButtonPattern })).toBeInTheDocument()
    })
  })
})
