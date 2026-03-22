import { ThemeProvider } from "@mui/material/styles"
import { QueryClient, QueryClientProvider } from "@tanstack/react-query"
import { render, screen, waitFor } from "@testing-library/react"
import userEvent from "@testing-library/user-event"
import { ReactElement } from "react"
import { FormProvider, useForm } from "react-hook-form"
import { MemoryRouter } from "react-router-dom"
import { RecoilRoot } from "recoil"
import { beforeEach, describe, expect, it, vi } from "vitest"

import DataInfoSection from "../../src/components/EditProject/DataInfoSection"
import SnackbarProvider from "../../src/components/SnackbarProvider"
import { initDmp } from "../../src/dmp"
import type { DmpFormValues, ResearchPhase } from "../../src/dmp"
import type { User } from "../../src/hooks/useUser"
import { theme } from "../../src/theme"

vi.mock("@/hooks/useRorSearch", () => ({
  useRorSearch: () => ({ results: [], isLoading: false, isError: false }),
}))

const mockUser: User = {
  grdmId: "user123",
  fullName: "Test User",
  givenName: "Test",
  familyName: "User",
  givenNameJa: null,
  familyNameJa: null,
  orcid: null,
  researcherId: null,
  affiliation: "Test Institution",
  timezone: "Asia/Tokyo",
  email: "test@example.com",
  grdmProfileUrl: "https://example.com/profile",
  profileImage: "https://example.com/profile.jpg",
}

function DataInfoSectionWrapper({ researchPhase }: { researchPhase: ResearchPhase }) {
  const dmp = initDmp(null)
  const methods = useForm<DmpFormValues>({
    defaultValues: {
      dmp: {
        ...dmp,
        metadata: {
          ...dmp.metadata,
          researchPhase,
        },
      },
    },
    mode: "onBlur",
  })
  return (
    <FormProvider {...methods}>
      <DataInfoSection user={mockUser} projects={[]} />
    </FormProvider>
  )
}

function renderWithProviders(ui: ReactElement) {
  const queryClient = new QueryClient({ defaultOptions: { queries: { retry: false } } })
  return render(
    <MemoryRouter>
      <ThemeProvider theme={theme}>
        <RecoilRoot>
          <QueryClientProvider client={queryClient}>
            <SnackbarProvider>{ui}</SnackbarProvider>
          </QueryClientProvider>
        </RecoilRoot>
      </ThemeProvider>
    </MemoryRouter>,
  )
}

describe("DataInfoSection - phase-based validation", () => {
  beforeEach(() => {
    vi.clearAllMocks()
  })

  describe("repository field", () => {
    it("is optional (no required asterisk) in 計画時 phase", async () => {
      const user = userEvent.setup()
      renderWithProviders(<DataInfoSectionWrapper researchPhase="計画時" />)

      await user.click(screen.getByRole("button", { name: /データを追加する/ }))

      // OurFormLabel renders: <label>text {required && <span>*</span>}</label>
      // Find the label Typography element for repository
      const labelEl = screen.getByText("リポジトリ情報 (リポジトリ URL・DOI リンク) (研究活動後)")
      // When required=false, no <span> child with "*" should exist inside the label
      const asterisk = labelEl.querySelector("span")
      expect(asterisk).toBeNull()
    })

    it("is required (has asterisk) in 報告時 phase", async () => {
      const user = userEvent.setup()
      renderWithProviders(<DataInfoSectionWrapper researchPhase="報告時" />)

      await user.click(screen.getByRole("button", { name: /データを追加する/ }))

      const labelEl = screen.getByText("リポジトリ情報 (リポジトリ URL・DOI リンク) (研究活動後)")
      const asterisk = labelEl.querySelector("span")
      expect(asterisk).not.toBeNull()
      expect(asterisk?.textContent).toBe("*")
    })

    it("shows validation error on submit in 報告時 phase when repository is empty", async () => {
      const user = userEvent.setup()
      renderWithProviders(<DataInfoSectionWrapper researchPhase="報告時" />)

      await user.click(screen.getByRole("button", { name: /データを追加する/ }))
      await user.click(screen.getByRole("button", { name: "追加" }))

      await waitFor(() => {
        expect(
          screen.getByText("リポジトリ情報 (リポジトリ URL・DOI リンク) (研究活動後) は必須です"),
        ).toBeInTheDocument()
      })
    })

    it("does not show validation error on submit in 計画時 phase when repository is empty", async () => {
      const user = userEvent.setup()
      renderWithProviders(<DataInfoSectionWrapper researchPhase="計画時" />)

      await user.click(screen.getByRole("button", { name: /データを追加する/ }))
      await user.click(screen.getByRole("button", { name: "追加" }))

      await waitFor(() => {
        // Other required fields will trigger errors, but NOT repository
        expect(
          screen.queryByText("リポジトリ情報 (リポジトリ URL・DOI リンク) (研究活動後) は必須です"),
        ).not.toBeInTheDocument()
      })
    })
  })

  describe("publicationDate field (掲載日・掲載更新日)", () => {
    it("is optional (no asterisk) in 計画時 phase", async () => {
      const user = userEvent.setup()
      renderWithProviders(<DataInfoSectionWrapper researchPhase="計画時" />)

      await user.click(screen.getByRole("button", { name: /データを追加する/ }))

      const labelEl = screen.getByText("掲載日・掲載更新日")
      const asterisk = labelEl.querySelector("span")
      expect(asterisk).toBeNull()
    })

    it("is required (has asterisk) in 研究中 phase", async () => {
      const user = userEvent.setup()
      renderWithProviders(<DataInfoSectionWrapper researchPhase="研究中" />)

      await user.click(screen.getByRole("button", { name: /データを追加する/ }))

      const labelEl = screen.getByText("掲載日・掲載更新日")
      const asterisk = labelEl.querySelector("span")
      expect(asterisk).not.toBeNull()
    })

    it("is required (has asterisk) in 報告時 phase", async () => {
      const user = userEvent.setup()
      renderWithProviders(<DataInfoSectionWrapper researchPhase="報告時" />)

      await user.click(screen.getByRole("button", { name: /データを追加する/ }))

      const labelEl = screen.getByText("掲載日・掲載更新日")
      const asterisk = labelEl.querySelector("span")
      expect(asterisk).not.toBeNull()
    })
  })

  describe("plannedPublicationDate field (データの公開予定日)", () => {
    it("is optional (no asterisk) in 計画時 phase", async () => {
      const user = userEvent.setup()
      renderWithProviders(<DataInfoSectionWrapper researchPhase="計画時" />)

      await user.click(screen.getByRole("button", { name: /データを追加する/ }))

      const labelEl = screen.getByText("データの公開予定日")
      const asterisk = labelEl.querySelector("span")
      expect(asterisk).toBeNull()
    })

    it("is optional in 研究中 phase", async () => {
      const user = userEvent.setup()
      renderWithProviders(<DataInfoSectionWrapper researchPhase="研究中" />)

      await user.click(screen.getByRole("button", { name: /データを追加する/ }))

      const labelEl = screen.getByText("データの公開予定日")
      const asterisk = labelEl.querySelector("span")
      expect(asterisk).toBeNull()
    })

    it("is required (has asterisk) in 報告時 phase", async () => {
      const user = userEvent.setup()
      renderWithProviders(<DataInfoSectionWrapper researchPhase="報告時" />)

      await user.click(screen.getByRole("button", { name: /データを追加する/ }))

      const labelEl = screen.getByText("データの公開予定日")
      const asterisk = labelEl.querySelector("span")
      expect(asterisk).not.toBeNull()
    })
  })
})
