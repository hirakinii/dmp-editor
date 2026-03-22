import { ThemeProvider } from "@mui/material/styles"
import { render, screen, waitFor } from "@testing-library/react"
import userEvent from "@testing-library/user-event"
import { ReactElement } from "react"
import { MemoryRouter } from "react-router"
import { RecoilRoot } from "recoil"
import { beforeEach, describe, expect, it, vi } from "vitest"

import ProjectTable from "../../../src/components/Home/ProjectTable"
import SnackbarProvider from "../../../src/components/SnackbarProvider"
import type { ProjectInfo } from "../../../src/grdmClient"
import type { User } from "../../../src/hooks/useUser"
import { theme } from "../../../src/theme"

// --- Mocks (hoisted to allow use in vi.mock factories) ---

const { mockShowSnackbar, mockReadDmpFile, mockExportToJspsExcel, mockExportToExcel } = vi.hoisted(() => ({
  mockShowSnackbar: vi.fn(),
  mockReadDmpFile: vi.fn(),
  mockExportToJspsExcel: vi.fn(),
  mockExportToExcel: vi.fn(),
}))

vi.mock("@/hooks/useSnackbar", async (importOriginal) => {
  const original = await importOriginal<typeof import("@/hooks/useSnackbar")>()
  return {
    ...original,
    useSnackbar: () => ({ showSnackbar: mockShowSnackbar }),
  }
})

vi.mock("@/grdmClient", async (importOriginal) => {
  const original = await importOriginal<typeof import("@/grdmClient")>()
  return {
    ...original,
    readDmpFile: mockReadDmpFile,
  }
})

vi.mock("@/jspsExport", () => ({
  exportToJspsExcel: mockExportToJspsExcel,
}))

vi.mock("@/excelExport", () => ({
  exportToExcel: mockExportToExcel,
}))

// --- Test data ---

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

const mockProjects: ProjectInfo[] = [
  {
    id: "project-001",
    type: "project",
    title: "DMP-Test Project 1",
    description: "desc1",
    category: "project",
    dateCreated: "2024-01-01T00:00:00Z",
    dateModified: "2024-06-01T00:00:00Z",
    html: "https://example.com/project-001",
    self: "https://example.com/api/project-001",
  },
  {
    id: "project-002",
    type: "project",
    title: "DMP-Test Project 2",
    description: "desc2",
    category: "project",
    dateCreated: "2024-02-01T00:00:00Z",
    dateModified: "2024-07-01T00:00:00Z",
    html: "https://example.com/project-002",
    self: "https://example.com/api/project-002",
  },
]

const mockDmp = { metadata: {}, dataInfo: [] }

// --- Helpers ---

function renderWithProviders(ui: ReactElement) {
  return render(
    <MemoryRouter>
      <ThemeProvider theme={theme}>
        <RecoilRoot>
          <SnackbarProvider>{ui}</SnackbarProvider>
        </RecoilRoot>
      </ThemeProvider>
    </MemoryRouter>,
  )
}

// --- Tests ---

describe("ProjectTable", () => {
  beforeEach(() => {
    vi.clearAllMocks()
    // Mock URL APIs for download
    vi.stubGlobal("URL", {
      createObjectURL: vi.fn(() => "blob:mock-url"),
      revokeObjectURL: vi.fn(),
    })
    // Suppress jsdom "Not implemented: navigation" warning from <a>.click()
    // eslint-disable-next-line @typescript-eslint/no-empty-function
    vi.spyOn(HTMLAnchorElement.prototype, "click").mockImplementation(() => {})
  })

  describe("Export button rendering", () => {
    it("renders an Export button for each project row", () => {
      renderWithProviders(<ProjectTable user={mockUser} projects={mockProjects} />)
      const exportButtons = screen.getAllByRole("button", { name: /Export/ })
      expect(exportButtons).toHaveLength(mockProjects.length)
    })

    it("renders both the edit button and export button in the same row", () => {
      renderWithProviders(<ProjectTable user={mockUser} projects={mockProjects} />)
      const editButtons = screen.getAllByRole("button", { name: /編集/ })
      const exportButtons = screen.getAllByRole("button", { name: /Export/ })
      expect(editButtons).toHaveLength(mockProjects.length)
      expect(exportButtons).toHaveLength(mockProjects.length)
    })
  })

  describe("Export menu", () => {
    it("shows export format menu when Export button is clicked", async () => {
      const user = userEvent.setup()
      renderWithProviders(<ProjectTable user={mockUser} projects={mockProjects} />)

      const exportButtons = screen.getAllByRole("button", { name: /Export/ })
      await user.click(exportButtons[0])

      expect(screen.getByText("サンプル形式")).toBeInTheDocument()
      expect(screen.getByText("JSPS 形式")).toBeInTheDocument()
    })

    it("hides menu after selecting an item", async () => {
      const user = userEvent.setup()
      mockReadDmpFile.mockResolvedValue({ dmp: mockDmp, node: {} })
      mockExportToJspsExcel.mockResolvedValue(new Blob(["test"], { type: "application/zip" }))

      renderWithProviders(<ProjectTable user={mockUser} projects={mockProjects} />)

      const exportButtons = screen.getAllByRole("button", { name: /Export/ })
      await user.click(exportButtons[0])
      await user.click(screen.getByText("JSPS 形式"))

      await waitFor(() => {
        expect(screen.queryByText("JSPS 形式")).not.toBeInTheDocument()
      })
    })
  })

  describe("JSPS export", () => {
    it("calls readDmpFile and exportToJspsExcel when JSPS format is selected", async () => {
      const user = userEvent.setup()
      const mockBlob = new Blob(["test"], { type: "application/zip" })
      mockReadDmpFile.mockResolvedValue({ dmp: mockDmp, node: {} })
      mockExportToJspsExcel.mockResolvedValue(mockBlob)

      renderWithProviders(<ProjectTable user={mockUser} projects={mockProjects} />)

      const exportButtons = screen.getAllByRole("button", { name: /Export/ })
      await user.click(exportButtons[0])
      await user.click(screen.getByText("JSPS 形式"))

      await waitFor(() => {
        expect(mockReadDmpFile).toHaveBeenCalledWith(expect.any(String), "project-001")
        expect(mockExportToJspsExcel).toHaveBeenCalledWith(mockDmp)
      })
    })
  })

  describe("Sample export", () => {
    it("calls readDmpFile and exportToExcel when sample format is selected", async () => {
      const user = userEvent.setup()
      const mockBlob = new Blob(["test"], { type: "application/vnd.ms-excel" })
      mockReadDmpFile.mockResolvedValue({ dmp: mockDmp, node: {} })
      mockExportToExcel.mockReturnValue(mockBlob)

      renderWithProviders(<ProjectTable user={mockUser} projects={mockProjects} />)

      const exportButtons = screen.getAllByRole("button", { name: /Export/ })
      await user.click(exportButtons[0])
      await user.click(screen.getByText("サンプル形式"))

      await waitFor(() => {
        expect(mockReadDmpFile).toHaveBeenCalledWith(expect.any(String), "project-001")
        expect(mockExportToExcel).toHaveBeenCalledWith(mockDmp)
      })
    })
  })

  describe("Filename for download (Bug 1)", () => {
    it("uses dmp-jsps-<project.title>.xlsx for JSPS format", async () => {
      const user = userEvent.setup()
      const mockBlob = new Blob(["test"], { type: "application/zip" })
      mockReadDmpFile.mockResolvedValue({ dmp: mockDmp, node: {} })
      mockExportToJspsExcel.mockResolvedValue(mockBlob)

      let capturedFilename: string | null = null
      vi.spyOn(HTMLAnchorElement.prototype, "click").mockImplementation(function (this: HTMLAnchorElement) {
        capturedFilename = this.download
      })

      renderWithProviders(<ProjectTable user={mockUser} projects={mockProjects} />)

      const exportButtons = screen.getAllByRole("button", { name: /Export/ })
      await user.click(exportButtons[0])
      await user.click(screen.getByText("JSPS 形式"))

      await waitFor(() => {
        expect(capturedFilename).toBe("dmp-jsps-DMP-Test Project 1.xlsx")
      })
    })

    it("uses dmp-sample-<project.title>.xlsx for sample format", async () => {
      const user = userEvent.setup()
      const mockBlob = new Blob(["test"], { type: "application/vnd.ms-excel" })
      mockReadDmpFile.mockResolvedValue({ dmp: mockDmp, node: {} })
      mockExportToExcel.mockResolvedValue(mockBlob)

      let capturedFilename: string | null = null
      vi.spyOn(HTMLAnchorElement.prototype, "click").mockImplementation(function (this: HTMLAnchorElement) {
        capturedFilename = this.download
      })

      renderWithProviders(<ProjectTable user={mockUser} projects={mockProjects} />)

      const exportButtons = screen.getAllByRole("button", { name: /Export/ })
      await user.click(exportButtons[0])
      await user.click(screen.getByText("サンプル形式"))

      await waitFor(() => {
        expect(capturedFilename).toBe("dmp-sample-DMP-Test Project 1.xlsx")
      })
    })
  })

  describe("Error handling", () => {
    it("shows error snackbar when readDmpFile fails", async () => {
      const user = userEvent.setup()
      mockReadDmpFile.mockRejectedValue(new Error("Network error"))

      renderWithProviders(<ProjectTable user={mockUser} projects={mockProjects} />)

      const exportButtons = screen.getAllByRole("button", { name: /Export/ })
      await user.click(exportButtons[0])
      await user.click(screen.getByText("JSPS 形式"))

      await waitFor(() => {
        expect(mockShowSnackbar).toHaveBeenCalledWith(
          expect.stringContaining("エクスポートに失敗しました"),
          "error",
        )
      })
    })

    it("shows 'DMP not found' snackbar when DMP file does not exist", async () => {
      const user = userEvent.setup()
      mockReadDmpFile.mockRejectedValue(
        Object.assign(new Error("Failed to read DMP file"), {
          cause: { status: 404 },
        }),
      )

      renderWithProviders(<ProjectTable user={mockUser} projects={mockProjects} />)

      const exportButtons = screen.getAllByRole("button", { name: /Export/ })
      await user.click(exportButtons[0])
      await user.click(screen.getByText("JSPS 形式"))

      await waitFor(() => {
        expect(mockShowSnackbar).toHaveBeenCalledWith(
          expect.stringContaining("エクスポートに失敗しました"),
          "error",
        )
      })
    })
  })
})
