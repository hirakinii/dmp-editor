import { ThemeProvider } from "@mui/material/styles"
import { render, screen } from "@testing-library/react"
import userEvent from "@testing-library/user-event"
import { FormProvider, useForm } from "react-hook-form"
import { describe, expect, it, vi } from "vitest"

import { KakenConfirmDialog } from "../../../src/components/EditProject/ProjectInfoSection"
import type { DmpFormValues } from "../../../src/dmp"
import type { KakenSearchResult } from "../../../src/hooks/useKakenProject"
import { theme } from "../../../src/theme"

// ---------------------------------------------------------------------------
// Test fixtures
// ---------------------------------------------------------------------------

const mockResult: KakenSearchResult = {
  projectInfo: {
    fundingAgency: "日本学術振興会",
    programName: "科学研究費助成事業",
    programCode: "JP",
    projectCode: "JP23K12345",
    projectName: "テストプロジェクト名",
    adoptionYear: "2023",
    startYear: "2023",
    endYear: "2025",
  },
  personInfos: [
    {
      role: ["研究代表者"],
      lastName: "山田",
      firstName: "太郎",
      eRadResearcherId: undefined,
      orcid: undefined,
      affiliation: "テスト大学",
      contact: undefined,
      grdmUserId: undefined,
      source: { role: "kaken", lastName: "kaken", firstName: "kaken" },
    },
    {
      role: ["研究分担者"],
      lastName: "鈴木",
      firstName: "花子",
      eRadResearcherId: undefined,
      orcid: undefined,
      affiliation: "別の大学",
      contact: undefined,
      grdmUserId: undefined,
      source: { role: "kaken", lastName: "kaken", firstName: "kaken" },
    },
  ],
}

const mockResultNoPersons: KakenSearchResult = {
  projectInfo: { ...mockResult.projectInfo },
  personInfos: [],
}

// ---------------------------------------------------------------------------
// Render helper
// ---------------------------------------------------------------------------

interface WrapperProps {
  open?: boolean
  kakenNumber?: string
  result?: KakenSearchResult
  onConfirm?: () => void
  onCancel?: () => void
}

function TestWrapper({
  open = true,
  kakenNumber = "23K12345",
  result = mockResult,
  onConfirm = vi.fn(),
  onCancel = vi.fn(),
}: WrapperProps) {
  const methods = useForm<DmpFormValues>()
  return (
    <ThemeProvider theme={theme}>
      <FormProvider {...methods}>
        <KakenConfirmDialog
          open={open}
          kakenNumber={kakenNumber}
          result={result}
          onConfirm={onConfirm}
          onCancel={onCancel}
        />
      </FormProvider>
    </ThemeProvider>
  )
}

// ---------------------------------------------------------------------------
// Tests
// ---------------------------------------------------------------------------

describe("KakenConfirmDialog", () => {
  it("renders the dialog title when open", () => {
    render(<TestWrapper />)
    expect(screen.getByText("この研究課題情報で自動補完しますか？")).toBeInTheDocument()
  })

  it("does not render dialog content when closed", () => {
    render(<TestWrapper open={false} />)
    expect(screen.queryByText("この研究課題情報で自動補完しますか？")).not.toBeInTheDocument()
  })

  it("displays KAKEN number", () => {
    render(<TestWrapper kakenNumber="23K12345" />)
    expect(screen.getByText("23K12345")).toBeInTheDocument()
  })

  it("displays programName, projectName, adoptionYear from result", () => {
    render(<TestWrapper />)
    expect(screen.getByText("科学研究費助成事業")).toBeInTheDocument()
    expect(screen.getByText("テストプロジェクト名")).toBeInTheDocument()
    expect(screen.getByText("2023")).toBeInTheDocument()
  })

  it("displays person names and roles", () => {
    render(<TestWrapper />)
    expect(screen.getByText(/山田\s*太郎/)).toBeInTheDocument()
    expect(screen.getByText(/鈴木\s*花子/)).toBeInTheDocument()
    expect(screen.getByText(/研究代表者/)).toBeInTheDocument()
    expect(screen.getByText(/研究分担者/)).toBeInTheDocument()
  })

  it("shows no-persons message when personInfos is empty", () => {
    render(<TestWrapper result={mockResultNoPersons} />)
    expect(screen.getByText("（担当者情報なし）")).toBeInTheDocument()
  })

  it("calls onConfirm when YES button is clicked", async () => {
    const onConfirm = vi.fn()
    render(<TestWrapper onConfirm={onConfirm} />)
    await userEvent.click(screen.getByRole("button", { name: "はい" }))
    expect(onConfirm).toHaveBeenCalledOnce()
  })

  it("calls onCancel when NO button is clicked", async () => {
    const onCancel = vi.fn()
    render(<TestWrapper onCancel={onCancel} />)
    await userEvent.click(screen.getByRole("button", { name: "いいえ" }))
    expect(onCancel).toHaveBeenCalledOnce()
  })
})
