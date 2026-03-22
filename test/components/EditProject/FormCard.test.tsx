import { ThemeProvider } from "@mui/material/styles"
import { QueryClient, QueryClientProvider } from "@tanstack/react-query"
import { render, screen, waitFor } from "@testing-library/react"
import userEvent from "@testing-library/user-event"
import { ReactElement } from "react"
import { FormProvider, useForm } from "react-hook-form"
import { MemoryRouter } from "react-router-dom"
import { RecoilRoot } from "recoil"
import { beforeEach, describe, expect, it, vi } from "vitest"

import FormCard from "../../../src/components/EditProject/FormCard"
import SnackbarProvider from "../../../src/components/SnackbarProvider"
import { initDmp } from "../../../src/dmp"
import type { DmpFormValues } from "../../../src/dmp"
import type { ProjectInfo } from "../../../src/grdmClient"
import { PartialSaveError } from "../../../src/hooks/useUpdateDmp"
import type { User } from "../../../src/hooks/useUser"
import { theme } from "../../../src/theme"

// Hoist mocks so they are accessible in vi.mock factories
const { mockNavigate, mockMutate } = vi.hoisted(() => {
  const mockNavigate = vi.fn()
  const mockMutate = vi.fn()
  return { mockNavigate, mockMutate }
})

// Mock heavy subcomponents to keep tests focused
vi.mock("../../../src/components/EditProject/GrdmProject", () => ({
  default: () => <div data-testid="grdm-project">GrdmProject</div>,
}))
vi.mock("../../../src/components/EditProject/DmpMetadataSection", () => ({
  default: () => <div data-testid="dmp-metadata-section">DmpMetadataSection</div>,
}))
vi.mock("../../../src/components/EditProject/ProjectInfoSection", () => ({
  default: () => <div data-testid="project-info-section">ProjectInfoSection</div>,
}))
vi.mock("../../../src/components/EditProject/PersonInfoSection", () => ({
  default: () => <div data-testid="person-info-section">PersonInfoSection</div>,
}))
vi.mock("../../../src/components/EditProject/DataInfoSection", () => ({
  default: () => <div data-testid="data-info-section">DataInfoSection</div>,
}))
vi.mock("../../../src/components/EditProject/ProjectTableSection", () => ({
  default: () => <div data-testid="project-table-section">ProjectTableSection</div>,
}))
vi.mock("../../../src/components/EditProject/FileTreeSection", () => ({
  default: () => <div data-testid="file-tree-section">FileTreeSection</div>,
}))
vi.mock("../../../src/hooks/useUpdateDmp", async (importOriginal) => {
  const actual = await importOriginal<typeof import("../../../src/hooks/useUpdateDmp")>()
  return {
    ...actual, // preserve PartialSaveError and other exports
    useUpdateDmp: () => ({ mutate: mockMutate }),
  }
})
vi.mock("react-router-dom", async (importOriginal) => {
  const mod = await importOriginal<typeof import("react-router-dom")>()
  return {
    ...mod,
    useNavigate: () => mockNavigate,
    useParams: () => ({ projectId: "test-project-id" }),
  }
})

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

const mockProjects: ProjectInfo[] = []

function FormCardWrapper({
  isNew = false,
  defaultValues,
  project,
  onSaveStart = vi.fn(),
  onSaveEnd = vi.fn(),
}: {
  isNew?: boolean
  defaultValues?: Partial<DmpFormValues>
  project?: ProjectInfo | null
  onSaveStart?: () => void
  onSaveEnd?: () => void
}) {
  const dmp = initDmp(null)
  const methods = useForm<DmpFormValues>({
    defaultValues: {
      dmp,
      ...defaultValues,
    },
    mode: "onBlur",
    reValidateMode: "onBlur",
  })
  return (
    <FormProvider {...methods}>
      <FormCard isNew={isNew} user={mockUser} project={project} projects={mockProjects} onSaveStart={onSaveStart} onSaveEnd={onSaveEnd} />
    </FormProvider>
  )
}

/**
 * Wrapper that registers dmp.metadata.submissionDate as required with an empty value
 * so that trigger() returns false when validating Step 0 fields. Used for testing
 * error indicator behavior (requirement ②).
 */
function FormCardWrapperWithValidation({ isNew = false }: { isNew?: boolean }) {
  const dmp = initDmp(null)
  const methods = useForm<DmpFormValues>({
    defaultValues: { dmp: { ...dmp, metadata: { ...dmp.metadata, submissionDate: "" } } },
    mode: "onBlur",
    reValidateMode: "onBlur",
  })
  return (
    <FormProvider {...methods}>
      {/* Hidden input registers submissionDate as required so trigger() fails on Step 0 */}
      <input
        {...methods.register("dmp.metadata.submissionDate", { required: "必須" })}
        data-testid="hidden-submission-date-input"
        style={{ position: "absolute", opacity: 0, pointerEvents: "none" }}
      />
      <FormCard isNew={isNew} user={mockUser} projects={mockProjects} onSaveStart={vi.fn()} onSaveEnd={vi.fn()} />
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

/** Helper: advance from step 0 to last step by clicking 次へ, waiting for each step content. */
async function advanceToLastStep(user: ReturnType<typeof userEvent.setup>) {
  const stepContentTestIds = [
    "project-info-section",
    "person-info-section",
    "data-info-section",
    "project-table-section",
  ]
  for (const testId of stepContentTestIds) {
    await user.click(screen.getByRole("button", { name: "次へ" }))
    await waitFor(() => expect(screen.getByTestId(testId)).toBeInTheDocument())
  }
}

describe("FormCard with Stepper", () => {
  beforeEach(() => {
    vi.clearAllMocks()
  })

  describe("Stepper rendering", () => {
    it("renders 5 step labels", () => {
      renderWithProviders(<FormCardWrapper />)
      expect(screen.getByText("基本設定")).toBeInTheDocument()
      expect(screen.getByText("プロジェクト情報")).toBeInTheDocument()
      expect(screen.getByText("担当者情報")).toBeInTheDocument()
      expect(screen.getByText("研究データ情報")).toBeInTheDocument()
      expect(screen.getByText("GRDM 連携")).toBeInTheDocument()
    })

    it("shows step 1 content (DmpMetadataSection) by default", () => {
      renderWithProviders(<FormCardWrapper />)
      expect(screen.getByTestId("dmp-metadata-section")).toBeInTheDocument()
    })

    it("does not show step 2 content by default", () => {
      renderWithProviders(<FormCardWrapper />)
      expect(screen.queryByTestId("project-info-section")).not.toBeInTheDocument()
    })
  })

  describe("navigation buttons", () => {
    it("renders 前へ button (disabled at step 1)", () => {
      renderWithProviders(<FormCardWrapper />)
      const backBtn = screen.getByRole("button", { name: "前へ" })
      expect(backBtn).toBeInTheDocument()
      expect(backBtn).toBeDisabled()
    })

    it("renders 次へ button at step 1", () => {
      renderWithProviders(<FormCardWrapper />)
      expect(screen.getByRole("button", { name: "次へ" })).toBeInTheDocument()
    })

    it("does not render save button at step 1 (existing project)", () => {
      renderWithProviders(<FormCardWrapper isNew={false} />)
      expect(screen.queryByRole("button", { name: /GRDM に保存する/ })).not.toBeInTheDocument()
    })
  })

  describe("step navigation", () => {
    it("advances to step 2 when 次へ is clicked (with valid data)", async () => {
      const user = userEvent.setup()
      // Provide valid default values for step 1 fields
      renderWithProviders(
        <FormCardWrapper
          defaultValues={{
            dmp: {
              ...initDmp(null),
              metadata: {
                revisionType: "新規",
                submissionDate: "2024-01-01",
                dateCreated: "2024-01-01",
                dateModified: "2024-01-01",
                researchPhase: "計画時",
              },
            },
          }}
        />,
      )

      await user.click(screen.getByRole("button", { name: "次へ" }))

      await waitFor(() => {
        expect(screen.getByTestId("project-info-section")).toBeInTheDocument()
      })
    })

    it("goes back to step 1 when 前へ is clicked from step 2", async () => {
      const user = userEvent.setup()
      renderWithProviders(
        <FormCardWrapper
          defaultValues={{
            dmp: {
              ...initDmp(null),
              metadata: {
                revisionType: "新規",
                submissionDate: "2024-01-01",
                dateCreated: "2024-01-01",
                dateModified: "2024-01-01",
                researchPhase: "計画時",
              },
            },
          }}
        />,
      )

      // Advance to step 2
      await user.click(screen.getByRole("button", { name: "次へ" }))
      await waitFor(() => {
        expect(screen.getByTestId("project-info-section")).toBeInTheDocument()
      })

      // Go back to step 1
      await user.click(screen.getByRole("button", { name: "前へ" }))
      await waitFor(() => {
        expect(screen.getByTestId("dmp-metadata-section")).toBeInTheDocument()
      })
    })

    it("jumps to step 3 when clicking the step label directly (isNew=false)", async () => {
      const user = userEvent.setup()
      renderWithProviders(<FormCardWrapper isNew={false} />)

      await user.click(screen.getByText("担当者情報"))

      await waitFor(() => {
        expect(screen.getByTestId("person-info-section")).toBeInTheDocument()
      })
    })

    it("does not show 次へ button at step 5 (last step)", async () => {
      const user = userEvent.setup()
      renderWithProviders(<FormCardWrapper />)

      // Jump to step 5 directly (isNew=false by default)
      await user.click(screen.getByText("GRDM 連携"))

      await waitFor(() => {
        expect(screen.queryByRole("button", { name: "次へ" })).not.toBeInTheDocument()
      })
    })

    it("前へ button is enabled at step 2", async () => {
      const user = userEvent.setup()
      renderWithProviders(<FormCardWrapper />)

      await user.click(screen.getByText("プロジェクト情報"))

      await waitFor(() => {
        const backBtn = screen.getByRole("button", { name: "前へ" })
        expect(backBtn).not.toBeDisabled()
      })
    })
  })

  describe("step bar navigation (requirement ①): isNew mode restricts forward navigation", () => {
    it("does NOT navigate forward when clicking a future step label in isNew=true mode", async () => {
      const user = userEvent.setup()
      renderWithProviders(<FormCardWrapper isNew />)

      // Try to jump to step 4 (GRDM 連携) from step 0
      await user.click(screen.getByText("GRDM 連携"))

      // Should remain on step 0
      await waitFor(() => {
        expect(screen.getByTestId("dmp-metadata-section")).toBeInTheDocument()
      })
      expect(screen.queryByTestId("project-table-section")).not.toBeInTheDocument()
    })

    it("does NOT navigate forward when clicking the next step label in isNew=true mode", async () => {
      const user = userEvent.setup()
      renderWithProviders(<FormCardWrapper isNew />)

      await user.click(screen.getByText("プロジェクト情報"))

      // Should remain on step 0
      await waitFor(() => {
        expect(screen.getByTestId("dmp-metadata-section")).toBeInTheDocument()
      })
    })

    it("allows going back via step bar in isNew=true mode (after advancing with 次へ)", async () => {
      const user = userEvent.setup()
      renderWithProviders(<FormCardWrapper isNew />)

      // Advance to step 2 via 次へ
      await user.click(screen.getByRole("button", { name: "次へ" }))
      await waitFor(() => {
        expect(screen.getByTestId("project-info-section")).toBeInTheDocument()
      })

      // Click step 1 (基本設定) in step bar to go back
      await user.click(screen.getByText("基本設定"))
      await waitFor(() => {
        expect(screen.getByTestId("dmp-metadata-section")).toBeInTheDocument()
      })
    })

    it("does not navigate to current step when clicking it in isNew=false mode", async () => {
      const user = userEvent.setup()
      renderWithProviders(<FormCardWrapper isNew={false} />)

      // Click the current active step (基本設定, index 0) - should stay on step 0
      await user.click(screen.getByText("基本設定"))

      await waitFor(() => {
        expect(screen.getByTestId("dmp-metadata-section")).toBeInTheDocument()
      })
    })
  })

  describe("error indicator (requirement ②): shows ! on steps with missing required fields", () => {
    it("shows ! error icon on current step when 次へ is clicked with invalid fields", async () => {
      const user = userEvent.setup()
      // Use wrapper that registers submissionDate as required (empty = invalid)
      renderWithProviders(<FormCardWrapperWithValidation isNew />)

      // submissionDate is empty → trigger("dmp.metadata.submissionDate") will fail
      await user.click(screen.getByRole("button", { name: "次へ" }))

      await waitFor(() => {
        expect(screen.getByTestId("step-error-icon")).toBeInTheDocument()
      })
    })

    it("shows ! error icon on previous step when navigating via step bar with invalid fields (isNew=false)", async () => {
      const user = userEvent.setup()
      renderWithProviders(<FormCardWrapperWithValidation isNew={false} />)

      // Click プロジェクト情報 (step 1) from step 0 while submissionDate is empty
      await user.click(screen.getByText("プロジェクト情報"))

      await waitFor(() => {
        // Navigation happens (step 1 content shown)
        expect(screen.getByTestId("project-info-section")).toBeInTheDocument()
      })
      // Error icon appears on step 0 (基本設定)
      expect(screen.getByTestId("step-error-icon")).toBeInTheDocument()
    })

    it("does not show ! error icon when navigating with valid fields (isNew=false)", async () => {
      const user = userEvent.setup()
      // Use standard wrapper with valid default values (all metadata fields have non-empty defaults)
      renderWithProviders(<FormCardWrapper isNew={false} />)

      await user.click(screen.getByText("プロジェクト情報"))

      await waitFor(() => {
        expect(screen.getByTestId("project-info-section")).toBeInTheDocument()
      })
      expect(screen.queryByTestId("step-error-icon")).not.toBeInTheDocument()
    })
  })

  describe("save button visibility across all steps", () => {
    describe("save button shown only on last step (both isNew=true and isNew=false)", () => {
      const nonLastStepLabels = ["プロジェクト情報", "担当者情報", "研究データ情報"]

      for (const label of nonLastStepLabels) {
        it(`hides save button on step: ${label} (isNew=false)`, async () => {
          const user = userEvent.setup()
          renderWithProviders(<FormCardWrapper isNew={false} />)

          await user.click(screen.getByText(label))

          await waitFor(() => {
            expect(screen.queryByRole("button", { name: /GRDM に保存する/ })).not.toBeInTheDocument()
          })
        })
      }

      it("hides save button on step 基本設定 (isNew=false)", () => {
        renderWithProviders(<FormCardWrapper isNew={false} />)
        expect(screen.queryByRole("button", { name: /GRDM に保存する/ })).not.toBeInTheDocument()
      })

      it("shows save button only on last step: GRDM 連携 (isNew=false, jump via step bar)", async () => {
        const user = userEvent.setup()
        renderWithProviders(<FormCardWrapper isNew={false} />)

        await user.click(screen.getByText("GRDM 連携"))

        await waitFor(() => {
          expect(screen.getByRole("button", { name: /GRDM に保存する/ })).toBeInTheDocument()
        })
      })

      it("hides save button on step 基本設定 (isNew=true)", () => {
        renderWithProviders(<FormCardWrapper isNew />)
        expect(screen.queryByRole("button", { name: /GRDM に保存する/ })).not.toBeInTheDocument()
      })

      it("shows save button on last step: GRDM 連携 (isNew=true, navigate via 次へ)", async () => {
        const user = userEvent.setup()
        renderWithProviders(<FormCardWrapper isNew />)

        await advanceToLastStep(user)

        await waitFor(() => {
          expect(screen.getByRole("button", { name: /GRDM に保存する/ })).toBeInTheDocument()
        })
      })
    })
  })

  describe("step 5 GRDM content", () => {
    it("shows ProjectTableSection and FileTreeSection at step 5", async () => {
      const user = userEvent.setup()
      renderWithProviders(<FormCardWrapper />)

      await user.click(screen.getByText("GRDM 連携"))

      await waitFor(() => {
        expect(screen.getByTestId("project-table-section")).toBeInTheDocument()
        expect(screen.getByTestId("file-tree-section")).toBeInTheDocument()
      })
    })
  })

  describe("page title", () => {
    it("shows 新規作成 when isNew=true", () => {
      renderWithProviders(<FormCardWrapper isNew />)
      expect(screen.getByText("DMP Project の新規作成")).toBeInTheDocument()
    })

    it("shows 編集 when isNew=false", () => {
      renderWithProviders(<FormCardWrapper isNew={false} />)
      expect(screen.getByText("DMP Project の編集")).toBeInTheDocument()
    })
  })

  describe("save and navigate on last step (GRDM 連携)", () => {
    it("navigates to detail page after successful save on last step (existing project)", async () => {
      const user = userEvent.setup()
      // Simulate mutate calling onSuccess
      mockMutate.mockImplementation((_args: unknown, { onSuccess }: { onSuccess: (id: string) => void }) => {
        onSuccess("test-project-id")
      })

      renderWithProviders(<FormCardWrapper isNew={false} />)

      // Jump to last step
      await user.click(screen.getByText("GRDM 連携"))
      await waitFor(() => {
        expect(screen.getByTestId("project-table-section")).toBeInTheDocument()
      })

      // Click save
      await user.click(screen.getByRole("button", { name: /GRDM に保存する/ }))

      // Should navigate to detail page without requiring modal interaction
      await waitFor(() => {
        expect(mockNavigate).toHaveBeenCalledWith("/projects/test-project-id/detail")
      })
    })

    it("navigates to detail page after successful save on last step (new project, navigate via 次へ)", async () => {
      const user = userEvent.setup()
      mockMutate.mockImplementation((_args: unknown, { onSuccess }: { onSuccess: (id: string) => void }) => {
        onSuccess("new-project-id")
      })

      renderWithProviders(<FormCardWrapper isNew />)

      // Navigate to last step via 次へ (step bar navigation is disabled for isNew)
      await advanceToLastStep(user)

      await waitFor(() => {
        expect(screen.getByTestId("project-table-section")).toBeInTheDocument()
      })

      // Click save
      await user.click(screen.getByRole("button", { name: /GRDM に保存する/ }))

      // Should navigate to the new project's detail page
      await waitFor(() => {
        expect(mockNavigate).toHaveBeenCalledWith("/projects/new-project-id/detail")
      })
    })

  })

  describe("PartialSaveError toast message", () => {
    it("shows retry message in toast when PartialSaveError is thrown", async () => {
      const user = userEvent.setup()
      mockMutate.mockImplementation(
        (_args: unknown, { onError }: { onError: (err: Error) => void }) => {
          onError(new PartialSaveError(new Error("Write failed")))
        },
      )

      renderWithProviders(<FormCardWrapper isNew={false} />)

      await user.click(screen.getByText("GRDM 連携"))
      await waitFor(() => expect(screen.getByTestId("project-table-section")).toBeInTheDocument())

      await user.click(screen.getByRole("button", { name: /GRDM に保存する/ }))

      await waitFor(() => {
        expect(
          screen.getByText(/プロジェクト名の変更は完了しましたが、DMP ファイルの保存に失敗しました。再度保存を実行してください。/),
        ).toBeInTheDocument()
      })
    })
  })

  describe("currentProjectTitle is passed to mutate", () => {
    it("passes project.title as currentProjectTitle when project is provided", async () => {
      const user = userEvent.setup()
      mockMutate.mockImplementation(vi.fn()) // pending

      const mockProject: ProjectInfo = {
        id: "proj-123",
        type: "nodes",
        title: "DMP-旧プロジェクト名",
        description: "",
        category: "project",
        dateCreated: "2024-01-01T00:00:00Z",
        dateModified: "2024-01-01T00:00:00Z",
        html: "https://example.com/proj-123",
        self: "https://api.example.com/nodes/proj-123/",
      }

      renderWithProviders(<FormCardWrapper isNew={false} project={mockProject} />)

      await user.click(screen.getByText("GRDM 連携"))
      await waitFor(() => expect(screen.getByTestId("project-table-section")).toBeInTheDocument())

      await user.click(screen.getByRole("button", { name: /GRDM に保存する/ }))

      await waitFor(() => {
        expect(mockMutate).toHaveBeenCalledWith(
          expect.objectContaining({ currentProjectTitle: "DMP-旧プロジェクト名" }),
          expect.anything(),
        )
      })
    })

    it("passes undefined as currentProjectTitle when project is null", async () => {
      const user = userEvent.setup()
      mockMutate.mockImplementation(vi.fn())

      renderWithProviders(<FormCardWrapper isNew={false} project={null} />)

      await user.click(screen.getByText("GRDM 連携"))
      await waitFor(() => expect(screen.getByTestId("project-table-section")).toBeInTheDocument())

      await user.click(screen.getByRole("button", { name: /GRDM に保存する/ }))

      await waitFor(() => {
        expect(mockMutate).toHaveBeenCalledWith(
          expect.objectContaining({ currentProjectTitle: undefined }),
          expect.anything(),
        )
      })
    })
  })

  describe("save callbacks (onSaveStart / onSaveEnd)", () => {
    it("calls onSaveStart when save button is clicked on last step", async () => {
      const user = userEvent.setup()
      const onSaveStart = vi.fn()
      const onSaveEnd = vi.fn()
      // mutate never calls back (simulates pending request)
      mockMutate.mockImplementation(vi.fn())

      renderWithProviders(
        <FormCardWrapper isNew={false} onSaveStart={onSaveStart} onSaveEnd={onSaveEnd} />,
      )

      await user.click(screen.getByText("GRDM 連携"))
      await waitFor(() => expect(screen.getByTestId("project-table-section")).toBeInTheDocument())

      await user.click(screen.getByRole("button", { name: /GRDM に保存する/ }))

      await waitFor(() => {
        expect(onSaveStart).toHaveBeenCalledTimes(1)
      })
    })

    it("calls onSaveEnd when save fails", async () => {
      const user = userEvent.setup()
      const onSaveStart = vi.fn()
      const onSaveEnd = vi.fn()
      mockMutate.mockImplementation(
        (_args: unknown, { onError }: { onError: (err: Error) => void }) => {
          onError(new Error("Network error"))
        },
      )

      renderWithProviders(
        <FormCardWrapper isNew={false} onSaveStart={onSaveStart} onSaveEnd={onSaveEnd} />,
      )

      await user.click(screen.getByText("GRDM 連携"))
      await waitFor(() => expect(screen.getByTestId("project-table-section")).toBeInTheDocument())

      await user.click(screen.getByRole("button", { name: /GRDM に保存する/ }))

      await waitFor(() => {
        expect(onSaveEnd).toHaveBeenCalledTimes(1)
      })
    })

    it("does NOT call onSaveEnd on successful save (navigate instead)", async () => {
      const user = userEvent.setup()
      const onSaveStart = vi.fn()
      const onSaveEnd = vi.fn()
      mockMutate.mockImplementation(
        (_args: unknown, { onSuccess }: { onSuccess: (id: string) => void }) => {
          onSuccess("test-project-id")
        },
      )

      renderWithProviders(
        <FormCardWrapper isNew={false} onSaveStart={onSaveStart} onSaveEnd={onSaveEnd} />,
      )

      await user.click(screen.getByText("GRDM 連携"))
      await waitFor(() => expect(screen.getByTestId("project-table-section")).toBeInTheDocument())

      await user.click(screen.getByRole("button", { name: /GRDM に保存する/ }))

      await waitFor(() => {
        expect(mockNavigate).toHaveBeenCalledWith("/projects/test-project-id/detail")
      })
      expect(onSaveEnd).not.toHaveBeenCalled()
    })
  })
})

