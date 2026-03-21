import { ThemeProvider } from "@mui/material/styles"
import { render, screen, waitFor } from "@testing-library/react"
import userEvent from "@testing-library/user-event"
import { ReactElement } from "react"
import { beforeEach, describe, expect, it, vi } from "vitest"

import ExportDmpCard from "../../../src/components/EditProject/ExportDmpCard"
import { initDmp } from "../../../src/dmp"
import type { Dmp } from "../../../src/dmp"
import { theme } from "../../../src/theme"

// --- Hoisted mocks ---

const { mockShowBoundary, mockExportToJspsExcel, mockExportToExcel } = vi.hoisted(() => ({
  mockShowBoundary: vi.fn(),
  mockExportToJspsExcel: vi.fn(),
  mockExportToExcel: vi.fn(),
}))

vi.mock("react-error-boundary", async (importOriginal) => {
  const original = await importOriginal<typeof import("react-error-boundary")>()
  return {
    ...original,
    useErrorBoundary: () => ({ showBoundary: mockShowBoundary }),
  }
})

vi.mock("@/jspsExport", () => ({
  exportToJspsExcel: mockExportToJspsExcel,
}))

vi.mock("@/excelExport", () => ({
  exportToExcel: mockExportToExcel,
}))

// --- Helpers ---

function renderWithTheme(ui: ReactElement) {
  return render(<ThemeProvider theme={theme}>{ui}</ThemeProvider>)
}

function makeDmp(): Dmp {
  return initDmp()
}

// --- Tests ---

describe("ExportDmpCard", () => {
  let capturedDownloadAttr: string | null = null

  beforeEach(() => {
    vi.clearAllMocks()
    capturedDownloadAttr = null
    vi.stubGlobal("URL", {
      createObjectURL: vi.fn(() => "blob:mock-url"),
      revokeObjectURL: vi.fn(),
    })
    vi.spyOn(HTMLAnchorElement.prototype, "click").mockImplementation(function (this: HTMLAnchorElement) {
      capturedDownloadAttr = this.download
    })
    mockExportToJspsExcel.mockResolvedValue(new Blob(["test"]))
    mockExportToExcel.mockResolvedValue(new Blob(["test"]))
  })

  describe("rendering", () => {
    it("renders the DMP output card title", () => {
      renderWithTheme(<ExportDmpCard dmp={makeDmp()} projectName="Test Project" />)
      expect(screen.getByText("DMP の出力")).toBeInTheDocument()
    })

    it("renders the download button", () => {
      renderWithTheme(<ExportDmpCard dmp={makeDmp()} projectName="Test Project" />)
      expect(screen.getByRole("button", { name: /DMP を出力する/ })).toBeInTheDocument()
    })
  })

  describe("filename for download", () => {
    it("uses dmp-jsps-<projectName>.xlsx for JSPS format", async () => {
      const user = userEvent.setup()
      renderWithTheme(<ExportDmpCard dmp={makeDmp()} projectName="My GRDM Project" />)

      await user.click(screen.getByRole("button", { name: /DMP を出力する/ }))
      await user.click(screen.getByText("JSPS 形式"))

      await waitFor(() => {
        expect(capturedDownloadAttr).toBe("dmp-jsps-My GRDM Project.xlsx")
      })
    })

    it("uses dmp-sample-<projectName>.xlsx for sample format", async () => {
      const user = userEvent.setup()
      renderWithTheme(<ExportDmpCard dmp={makeDmp()} projectName="My GRDM Project" />)

      await user.click(screen.getByRole("button", { name: /DMP を出力する/ }))
      await user.click(screen.getByText("サンプル形式"))

      await waitFor(() => {
        expect(capturedDownloadAttr).toBe("dmp-sample-My GRDM Project.xlsx")
      })
    })

    it("falls back to 'untitled' when projectName is empty", async () => {
      const user = userEvent.setup()
      renderWithTheme(<ExportDmpCard dmp={makeDmp()} projectName="" />)

      await user.click(screen.getByRole("button", { name: /DMP を出力する/ }))
      await user.click(screen.getByText("JSPS 形式"))

      await waitFor(() => {
        expect(capturedDownloadAttr).toBe("dmp-jsps-untitled.xlsx")
      })
    })
  })

  describe("download behavior", () => {
    it("calls exportToJspsExcel with the provided dmp", async () => {
      const user = userEvent.setup()
      const dmp = makeDmp()
      renderWithTheme(<ExportDmpCard dmp={dmp} projectName="Project" />)

      await user.click(screen.getByRole("button", { name: /DMP を出力する/ }))
      await user.click(screen.getByText("JSPS 形式"))

      await waitFor(() => {
        expect(mockExportToJspsExcel).toHaveBeenCalledWith(dmp)
      })
    })

    it("calls exportToExcel with the provided dmp", async () => {
      const user = userEvent.setup()
      const dmp = makeDmp()
      renderWithTheme(<ExportDmpCard dmp={dmp} projectName="Project" />)

      await user.click(screen.getByRole("button", { name: /DMP を出力する/ }))
      await user.click(screen.getByText("サンプル形式"))

      await waitFor(() => {
        expect(mockExportToExcel).toHaveBeenCalledWith(dmp)
      })
    })

    it("calls showBoundary when exportToJspsExcel throws", async () => {
      const user = userEvent.setup()
      const error = new Error("Export failed")
      mockExportToJspsExcel.mockRejectedValue(error)

      renderWithTheme(<ExportDmpCard dmp={makeDmp()} projectName="Project" />)

      await user.click(screen.getByRole("button", { name: /DMP を出力する/ }))
      await user.click(screen.getByText("JSPS 形式"))

      await waitFor(() => {
        expect(mockShowBoundary).toHaveBeenCalledWith(error)
      })
    })
  })
})
