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
import { initDataInfo, initDmp } from "../../src/dmp"
import type { DataInfo, DmpFormValues, ResearchPhase } from "../../src/dmp"
import type { User } from "../../src/hooks/useUser"
import { theme } from "../../src/theme"

vi.mock("@/hooks/useRorSearch", () => ({
  useRorSearch: () => ({ results: [], isLoading: false, isError: false }),
}))

vi.mock("@/hooks/useGrdmFileItemMetadata", () => ({
  useGrdmFileItemMetadata: () => ({
    data: null,
    isFetching: false,
    isError: false,
    refetch: vi.fn(),
  }),
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

function DataInfoSectionWrapper({
  researchPhase,
  initialDataInfos,
}: {
  researchPhase: ResearchPhase
  initialDataInfos?: DataInfo[]
}) {
  const dmp = initDmp(null)
  const methods = useForm<DmpFormValues>({
    defaultValues: {
      dmp: {
        ...dmp,
        metadata: {
          ...dmp.metadata,
          researchPhase,
        },
        dataInfo: initialDataInfos ?? [],
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

      const labelEl = await screen.findByText("データの公開予定日")
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

      const labelEl = await screen.findByText("データの公開予定日")
      const asterisk = labelEl.querySelector("span")
      expect(asterisk).not.toBeNull()
    })
  })
})

describe("DataInfoSection - accordion behavior", () => {
  beforeEach(() => {
    vi.clearAllMocks()
  })

  it("opens accordion inline when 編集 button is clicked", async () => {
    const user = userEvent.setup()
    const dataInfo: DataInfo = {
      ...initDataInfo(),
      dataName: "テストデータ",
      researchField: "ライフサイエンス",
      dataType: "データセット",
    }
    renderWithProviders(
      <DataInfoSectionWrapper researchPhase="計画時" initialDataInfos={[dataInfo]} />,
    )

    // The accordion form should not be visible initially
    expect(screen.queryByRole("button", { name: "保存" })).toBeNull()

    // Click the 編集 button
    await user.click(screen.getByRole("button", { name: /編集/ }))

    // Form should now be visible inline (not in a dialog)
    expect(screen.getByRole("button", { name: "保存" })).toBeInTheDocument()
  })

  it("closes accordion when キャンセル button is clicked", async () => {
    const user = userEvent.setup()
    const dataInfo: DataInfo = {
      ...initDataInfo(),
      dataName: "テストデータ",
      researchField: "ライフサイエンス",
      dataType: "データセット",
    }
    renderWithProviders(
      <DataInfoSectionWrapper researchPhase="計画時" initialDataInfos={[dataInfo]} />,
    )

    await user.click(screen.getByRole("button", { name: /編集/ }))
    expect(screen.getByRole("button", { name: "保存" })).toBeInTheDocument()

    await user.click(screen.getByRole("button", { name: /キャンセル/ }))

    await waitFor(() => {
      expect(screen.queryByRole("button", { name: "保存" })).toBeNull()
    })
  })

  it("opens add form inline when データを追加する is clicked", async () => {
    const user = userEvent.setup()
    renderWithProviders(<DataInfoSectionWrapper researchPhase="計画時" />)

    await user.click(screen.getByRole("button", { name: /データを追加する/ }))

    expect(await screen.findByRole("button", { name: "追加" })).toBeInTheDocument()
  })
})

describe("DataInfoSection - source badge", () => {
  beforeEach(() => {
    vi.clearAllMocks()
  })

  it("shows GRDMファイルメタデータ badge when source.dataName is grdm", async () => {
    const user = userEvent.setup()
    const dataInfo: DataInfo = {
      ...initDataInfo(),
      dataName: "GRDM由来データ",
      researchField: "ライフサイエンス",
      dataType: "データセット",
      source: { dataName: "grdm" },
    }
    renderWithProviders(
      <DataInfoSectionWrapper researchPhase="計画時" initialDataInfos={[dataInfo]} />,
    )

    await user.click(screen.getByRole("button", { name: /編集/ }))

    await waitFor(() => {
      expect(screen.getByText("GRDMファイルメタデータ")).toBeInTheDocument()
    })
  })

  it("shows ユーザーによる入力 badge when source.dataName is manual", async () => {
    const user = userEvent.setup()
    const dataInfo: DataInfo = {
      ...initDataInfo(),
      dataName: "手動入力データ",
      researchField: "ライフサイエンス",
      dataType: "データセット",
      source: { dataName: "manual" },
    }
    renderWithProviders(
      <DataInfoSectionWrapper researchPhase="計画時" initialDataInfos={[dataInfo]} />,
    )

    await user.click(screen.getByRole("button", { name: /編集/ }))

    await waitFor(() => {
      expect(screen.getByText("ユーザーによる入力")).toBeInTheDocument()
    })
  })

  it("shows no source badge when source is undefined", async () => {
    const user = userEvent.setup()
    const dataInfo: DataInfo = {
      ...initDataInfo(),
      dataName: "未設定データ",
      researchField: "ライフサイエンス",
      dataType: "データセット",
      source: undefined,
    }
    renderWithProviders(
      <DataInfoSectionWrapper researchPhase="計画時" initialDataInfos={[dataInfo]} />,
    )

    await user.click(screen.getByRole("button", { name: /編集/ }))

    await waitFor(() => {
      expect(screen.queryByText("GRDMファイルメタデータ")).toBeNull()
      expect(screen.queryByText("ユーザーによる入力")).toBeNull()
    })
  })
})

describe("DataInfoSection - GRDM metadata fetch button", () => {
  beforeEach(() => {
    vi.clearAllMocks()
  })

  it("disables the fetch button when no linked GRDM files exist", async () => {
    const user = userEvent.setup()
    const dataInfo: DataInfo = {
      ...initDataInfo(),
      dataName: "リンクなしデータ",
      researchField: "ライフサイエンス",
      dataType: "データセット",
      linkedGrdmFiles: [],
    }
    renderWithProviders(
      <DataInfoSectionWrapper researchPhase="計画時" initialDataInfos={[dataInfo]} />,
    )

    await user.click(screen.getByRole("button", { name: /編集/ }))

    await waitFor(() => {
      const fetchButton = screen.getByRole("button", { name: /GRDMメタデータを取得/ })
      expect(fetchButton).toBeDisabled()
    })
  })

  it("enables the fetch button when linked GRDM files exist", async () => {
    const user = userEvent.setup()
    const dataInfo: DataInfo = {
      ...initDataInfo(),
      dataName: "リンクありデータ",
      researchField: "ライフサイエンス",
      dataType: "データセット",
      linkedGrdmFiles: [{
        projectId: "proj123",
        nodeId: "node456",
        label: "test.csv",
        materialized_path: "/test.csv",
        type: "file",
      }],
    }
    renderWithProviders(
      <DataInfoSectionWrapper researchPhase="計画時" initialDataInfos={[dataInfo]} />,
    )

    await user.click(screen.getByRole("button", { name: /編集/ }))

    await waitFor(() => {
      const fetchButton = screen.getByRole("button", { name: /GRDMメタデータを取得/ })
      expect(fetchButton).toBeEnabled()
    })
  })
})
