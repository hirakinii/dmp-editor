import { QueryClient, QueryClientProvider } from "@tanstack/react-query"
import { renderHook, act, waitFor } from "@testing-library/react"
import { createElement } from "react"
import { RecoilRoot } from "recoil"
import { describe, it, expect, vi, beforeEach } from "vitest"

import { initDmp } from "../../src/dmp"
import { DMP_PROJECT_PREFIX } from "../../src/grdmClient"
import { useUpdateDmp, PartialSaveError } from "../../src/hooks/useUpdateDmp"

// --- Mocks ---

const mockCreateProject = vi.fn()
const mockUpdateProjectTitle = vi.fn()
const mockWriteDmpFile = vi.fn()

vi.mock("@/grdmClient", async (importOriginal) => {
  const actual = await importOriginal<typeof import("../../src/grdmClient")>()
  return {
    ...actual,
    createProject: (...args: unknown[]) => mockCreateProject(...args),
    updateProjectTitle: (...args: unknown[]) => mockUpdateProjectTitle(...args),
    writeDmpFile: (...args: unknown[]) => mockWriteDmpFile(...args),
  }
})

vi.mock("recoil", async (importOriginal) => {
  const actual = await importOriginal<typeof import("recoil")>()
  return {
    ...actual,
    useRecoilValue: () => "test-token",
  }
})

// --- Wrapper ---

function createWrapper() {
  const queryClient = new QueryClient({ defaultOptions: { queries: { retry: false }, mutations: { retry: false } } })
  return ({ children }: { children: React.ReactNode }) =>
    createElement(
      RecoilRoot,
      null,
      createElement(QueryClientProvider, { client: queryClient }, children),
    )
}

// --- Helpers ---

function makeFormValues(projectName = "テストプロジェクト") {
  return { dmp: { ...initDmp(null), projectInfo: { ...initDmp(null).projectInfo, projectName } } }
}

// --- Tests ---

describe("useUpdateDmp", () => {
  beforeEach(() => {
    vi.clearAllMocks()
  })

  describe("isNew=true (new project creation)", () => {
    it("calls createProject with DMP- prefix and returns new project id", async () => {
      mockCreateProject.mockResolvedValue({ id: "new-id" })
      mockWriteDmpFile.mockResolvedValue(undefined)

      const { result } = renderHook(() => useUpdateDmp(), { wrapper: createWrapper() })

      let returnedId: string | undefined
      await act(async () => {
        result.current.mutate(
          { projectId: "", isNew: true, formValues: makeFormValues("マイプロジェクト") },
          { onSuccess: (id) => { returnedId = id } },
        )
      })

      await waitFor(() => expect(returnedId).toBe("new-id"))
      expect(mockCreateProject).toHaveBeenCalledWith("test-token", `${DMP_PROJECT_PREFIX}マイプロジェクト`)
      expect(mockUpdateProjectTitle).not.toHaveBeenCalled()
    })
  })

  describe("isNew=false (existing project update)", () => {
    it("does NOT call updateProjectTitle when title is unchanged", async () => {
      mockWriteDmpFile.mockResolvedValue(undefined)

      const { result } = renderHook(() => useUpdateDmp(), { wrapper: createWrapper() })

      await act(async () => {
        result.current.mutate({
          projectId: "proj-abc",
          isNew: false,
          formValues: makeFormValues("テストプロジェクト"),
          currentProjectTitle: `${DMP_PROJECT_PREFIX}テストプロジェクト`,
        })
      })

      await waitFor(() => expect(mockWriteDmpFile).toHaveBeenCalled())
      expect(mockUpdateProjectTitle).not.toHaveBeenCalled()
    })

    it("does NOT call updateProjectTitle when currentProjectTitle is undefined", async () => {
      mockWriteDmpFile.mockResolvedValue(undefined)

      const { result } = renderHook(() => useUpdateDmp(), { wrapper: createWrapper() })

      await act(async () => {
        result.current.mutate({
          projectId: "proj-abc",
          isNew: false,
          formValues: makeFormValues("テストプロジェクト"),
          // currentProjectTitle omitted
        })
      })

      await waitFor(() => expect(mockWriteDmpFile).toHaveBeenCalled())
      expect(mockUpdateProjectTitle).not.toHaveBeenCalled()
    })

    it("calls updateProjectTitle with new title when project name changed", async () => {
      mockUpdateProjectTitle.mockResolvedValue(undefined)
      mockWriteDmpFile.mockResolvedValue(undefined)

      const { result } = renderHook(() => useUpdateDmp(), { wrapper: createWrapper() })

      await act(async () => {
        result.current.mutate({
          projectId: "proj-abc",
          isNew: false,
          formValues: makeFormValues("新しいプロジェクト名"),
          currentProjectTitle: `${DMP_PROJECT_PREFIX}古いプロジェクト名`,
        })
      })

      await waitFor(() => expect(mockWriteDmpFile).toHaveBeenCalled())
      expect(mockUpdateProjectTitle).toHaveBeenCalledWith(
        "test-token",
        "proj-abc",
        `${DMP_PROJECT_PREFIX}新しいプロジェクト名`,
      )
    })

    it("throws PartialSaveError when rename succeeds but DMP write fails", async () => {
      mockUpdateProjectTitle.mockResolvedValue(undefined)
      mockWriteDmpFile.mockRejectedValue(new Error("Write failed"))

      const { result } = renderHook(() => useUpdateDmp(), { wrapper: createWrapper() })

      let caughtError: unknown
      await act(async () => {
        result.current.mutate(
          {
            projectId: "proj-abc",
            isNew: false,
            formValues: makeFormValues("新しいプロジェクト名"),
            currentProjectTitle: `${DMP_PROJECT_PREFIX}古いプロジェクト名`,
          },
          { onError: (err) => { caughtError = err } },
        )
      })

      await waitFor(() => expect(caughtError).toBeDefined())
      expect(caughtError).toBeInstanceOf(PartialSaveError)
    })

    it("throws generic error (not PartialSaveError) when rename was not performed and DMP write fails", async () => {
      mockWriteDmpFile.mockRejectedValue(new Error("Write failed"))

      const { result } = renderHook(() => useUpdateDmp(), { wrapper: createWrapper() })

      let caughtError: unknown
      await act(async () => {
        result.current.mutate(
          {
            projectId: "proj-abc",
            isNew: false,
            formValues: makeFormValues("テストプロジェクト"),
            currentProjectTitle: `${DMP_PROJECT_PREFIX}テストプロジェクト`, // unchanged
          },
          { onError: (err) => { caughtError = err } },
        )
      })

      await waitFor(() => expect(caughtError).toBeDefined())
      expect(caughtError).not.toBeInstanceOf(PartialSaveError)
      expect(caughtError).toBeInstanceOf(Error)
    })

    it("does NOT call writeDmpFile when rename fails", async () => {
      mockUpdateProjectTitle.mockRejectedValue(new Error("Rename failed"))

      const { result } = renderHook(() => useUpdateDmp(), { wrapper: createWrapper() })

      let caughtError: unknown
      await act(async () => {
        result.current.mutate(
          {
            projectId: "proj-abc",
            isNew: false,
            formValues: makeFormValues("新しいプロジェクト名"),
            currentProjectTitle: `${DMP_PROJECT_PREFIX}古いプロジェクト名`,
          },
          { onError: (err) => { caughtError = err } },
        )
      })

      await waitFor(() => expect(caughtError).toBeDefined())
      expect(mockWriteDmpFile).not.toHaveBeenCalled()
    })
  })
})
