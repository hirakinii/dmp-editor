import { ThemeProvider } from "@mui/material/styles"
import { QueryClient, QueryClientProvider } from "@tanstack/react-query"
import { render, screen } from "@testing-library/react"
import { MemoryRouter, Route, Routes } from "react-router-dom"
import { RecoilRoot } from "recoil"
import { beforeEach, describe, expect, it, vi } from "vitest"

import type { Dmp } from "../../src/dmp"
import DetailProject from "../../src/pages/DetailProject"
import { theme } from "../../src/theme"

// --- Mocks ---

const { mockUseDmp } = vi.hoisted(() => ({
  mockUseDmp: vi.fn(),
}))

vi.mock("@/hooks/useDmp", () => ({
  useDmp: mockUseDmp,
}))

// Frame/AuthHelper depends on token; bypass auth
vi.mock("@/components/Frame", () => ({
  default: ({ children }: { children: React.ReactNode }) => <div data-testid="frame">{children}</div>,
}))

vi.mock("@/components/EditProject/ExportDmpCard", () => ({
  default: ({ projectName }: { projectName: string }) => (
    <div data-testid="export-dmp-card" data-project-name={projectName}>
      ExportDmpCard
    </div>
  ),
}))

// --- Test data ---

const mockDmp: Dmp = {
  metadata: {
    revisionType: "新規",
    submissionDate: "2024-01-15",
    dateCreated: "2024-01-10",
    dateModified: "2024-06-20",
    researchPhase: "計画時",
  },
  projectInfo: {
    fundingAgency: "日本学術振興会",
    programName: "科学研究費助成事業",
    programCode: "001",
    projectCode: "123456789012345",
    projectName: "テスト研究プロジェクト",
    adoptionYear: "2024",
    startYear: "2024",
    endYear: "2026",
  },
  personInfo: [
    {
      role: ["研究代表者"],
      lastName: "山田",
      firstName: "太郎",
      eRadResearcherId: "12345678",
      orcid: "0000-0000-0000-0001",
      affiliation: "テスト大学",
      contact: "yamada@example.com",
    },
  ],
  dataInfo: [
    {
      dataName: "実験データセット",
      description: "実験データの説明",
      researchField: "ライフサイエンス",
      dataType: "データセット",
      usagePolicy: "研究目的のみ",
      repositoryInformation: "https://example.com/repo",
      accessRights: "公開",
      dataManagementAgency: "テスト大学",
      dataManager: "情報基盤センター",
      dataManagerContact: "dms@example.com",
      linkedGrdmFiles: [],
    },
  ],
  linkedGrdmProjects: [],
}

// --- Helper ---

function renderDetailProject(projectId = "proj-001") {
  const queryClient = new QueryClient({
    defaultOptions: { queries: { retry: false } },
  })
  return render(
    <MemoryRouter initialEntries={[`/projects/${projectId}/detail`]}>
      <ThemeProvider theme={theme}>
        <RecoilRoot>
          <QueryClientProvider client={queryClient}>
            <Routes>
              <Route path="/projects/:projectId/detail" element={<DetailProject />} />
            </Routes>
          </QueryClientProvider>
        </RecoilRoot>
      </ThemeProvider>
    </MemoryRouter>,
  )
}

// --- Tests ---

describe("DetailProject", () => {
  beforeEach(() => {
    vi.clearAllMocks()
  })

  describe("Loading state", () => {
    it("shows loading indicator while data is being fetched", () => {
      mockUseDmp.mockReturnValue({ isLoading: true, data: null, error: null })
      renderDetailProject()
      expect(screen.getByText(/Loading/i)).toBeInTheDocument()
    })
  })

  describe("DMP data display", () => {
    beforeEach(() => {
      mockUseDmp.mockReturnValue({ isLoading: false, data: mockDmp, error: null })
    })

    it("renders the page heading", () => {
      renderDetailProject()
      expect(screen.getByText("DMP Project の詳細")).toBeInTheDocument()
    })

    it("displays DMP creation date", () => {
      renderDetailProject()
      expect(screen.getByText("2024-01-10")).toBeInTheDocument()
    })

    it("displays DMP last modified date", () => {
      renderDetailProject()
      expect(screen.getByText("2024-06-20")).toBeInTheDocument()
    })

    it("displays project info fields", () => {
      renderDetailProject()
      expect(screen.getByText("テスト研究プロジェクト")).toBeInTheDocument()
      expect(screen.getByText("日本学術振興会")).toBeInTheDocument()
      expect(screen.getByText("123456789012345")).toBeInTheDocument()
    })

    it("displays person info in a table", () => {
      renderDetailProject()
      expect(screen.getByText("山田")).toBeInTheDocument()
      expect(screen.getByText("太郎")).toBeInTheDocument()
      expect(screen.getAllByText("テスト大学").length).toBeGreaterThanOrEqual(1)
    })

    it("displays data info in a table", () => {
      renderDetailProject()
      expect(screen.getByText("実験データセット")).toBeInTheDocument()
      expect(screen.getByText("ライフサイエンス")).toBeInTheDocument()
    })

    it("renders the edit button with the correct link", () => {
      renderDetailProject("proj-001")
      const editLink = screen.getByRole("link", { name: /編集する/ })
      expect(editLink).toBeInTheDocument()
      expect(editLink).toHaveAttribute("href", "/projects/proj-001")
    })

    it("renders ExportDmpCard with the project name", () => {
      renderDetailProject()
      const card = screen.getByTestId("export-dmp-card")
      expect(card).toBeInTheDocument()
      expect(card).toHaveAttribute("data-project-name", "テスト研究プロジェクト")
    })
  })
})
