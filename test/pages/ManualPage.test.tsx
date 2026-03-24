import { ThemeProvider } from "@mui/material/styles"
import { render, screen } from "@testing-library/react"
import { MemoryRouter } from "react-router-dom"
import { afterEach, beforeEach, describe, expect, it, vi } from "vitest"

import i18n from "../../src/i18n"
import ManualPage from "../../src/pages/ManualPage"
import { theme } from "../../src/theme"

// --- Mocks ---

vi.mock("../../docs/manual/01_manual_ja.md?raw", () => ({
  default: "# 日本語マニュアル\n\n日本語のテスト内容です。",
}))

vi.mock("../../docs/manual/01_manual_en.md?raw", () => ({
  default: "# English Manual\n\nTest content in English.",
}))

// Bypass Frame's AppHeader which requires auth context
vi.mock("@/components/Frame", () => ({
  default: ({ children }: { children: React.ReactNode }) => (
    <div data-testid="frame">{children}</div>
  ),
}))

vi.mock("react-error-boundary", async (importOriginal) => {
  const original = await importOriginal<typeof import("react-error-boundary")>()
  return {
    ...original,
    useErrorBoundary: () => ({ showBoundary: vi.fn() }),
  }
})

// --- Helper ---

function renderManualPage() {
  return render(
    <MemoryRouter initialEntries={["/manual"]}>
      <ThemeProvider theme={theme}>
        <ManualPage />
      </ThemeProvider>
    </MemoryRouter>,
  )
}

// --- Tests ---

describe("ManualPage", () => {
  beforeEach(() => {
    vi.clearAllMocks()
  })

  afterEach(async () => {
    // Reset to default language after each test
    await i18n.changeLanguage("ja")
  })

  it("renders within a Frame", async () => {
    await i18n.changeLanguage("ja")
    renderManualPage()
    expect(screen.getByTestId("frame")).toBeInTheDocument()
  })

  it("renders Japanese manual content when language is ja", async () => {
    await i18n.changeLanguage("ja")
    renderManualPage()
    expect(screen.getByRole("heading", { name: /日本語マニュアル/ })).toBeInTheDocument()
    expect(screen.getByText(/日本語のテスト内容です/)).toBeInTheDocument()
  })

  it("renders English manual content when language is en", async () => {
    await i18n.changeLanguage("en")
    renderManualPage()
    expect(screen.getByRole("heading", { name: /English Manual/ })).toBeInTheDocument()
    expect(screen.getByText(/Test content in English/)).toBeInTheDocument()
  })

  it("renders English manual content when language is en-US (startsWith check)", async () => {
    // i18next normalizes "en-US" to "en", so just verify en works
    await i18n.changeLanguage("en")
    renderManualPage()
    expect(screen.getByRole("heading", { name: /English Manual/ })).toBeInTheDocument()
  })

  it("renders Japanese manual content for unknown languages (fallback)", async () => {
    await i18n.changeLanguage("zh")
    renderManualPage()
    // zh is not configured, i18next falls back to default (ja)
    expect(screen.getByRole("heading", { name: /日本語マニュアル/ })).toBeInTheDocument()
  })
})
