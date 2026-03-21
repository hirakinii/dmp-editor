import "../../src/vite-env.d.ts"
import { KakenApiClient } from "@hirakinii-packages/kaken-api-client-typescript"
import type { Project, ProjectsResponse } from "@hirakinii-packages/kaken-api-client-typescript"
import { QueryClient, QueryClientProvider } from "@tanstack/react-query"
import { renderHook } from "@testing-library/react"
import { createElement } from "react"
import { describe, it, expect, vi, beforeEach } from "vitest"

import { kakenProjectToDmpProjectInfo, useKakenProject } from "../../src/hooks/useKakenProject"

// Mock the KakenApiClient
const mockSearch = vi.fn()

vi.mock("@hirakinii-packages/kaken-api-client-typescript", () => ({
  KakenApiClient: vi.fn().mockImplementation(() => ({
    projects: { search: mockSearch },
    researchers: {},
    cache: {},
    [Symbol.asyncDispose]: vi.fn(),
  })),
}))

function createWrapper() {
  const queryClient = new QueryClient({ defaultOptions: { queries: { retry: false } } })
  return ({ children }: { children: React.ReactNode }) =>
    createElement(QueryClientProvider, { client: queryClient }, children)
}

const mockProject: Project = {
  awardNumber: "23K12345",
  recordSet: "kakenhi",
  title: "テスト研究プロジェクト",
  created: new Date("2023-04-01"),
  allocations: [
    {
      name: "科学研究費助成事業",
      code: "JP",
    },
  ],
  periodOfAward: {
    startFiscalYear: 2023,
    endFiscalYear: 2026,
    searchStartFiscalYear: 2023,
    searchEndFiscalYear: 2026,
  },
  identifiers: [{ type: "nationalAwardNumber", value: "JP23K12345" }],
}

describe("kakenProjectToDmpProjectInfo", () => {
  it("maps all fields correctly from a full KAKEN project", () => {
    const result = kakenProjectToDmpProjectInfo(mockProject)

    expect(result.fundingAgency).toBe("日本学術振興会")
    expect(result.programName).toBe("科学研究費助成事業")
    expect(result.programCode).toBe("JP")
    expect(result.projectCode).toBe("JP23K12345")
    expect(result.projectName).toBe("テスト研究プロジェクト")
    expect(result.adoptionYear).toBe("2023")
    expect(result.startYear).toBe("2023")
    expect(result.endYear).toBe("2026")
  })

  it("returns empty strings for agency/program/code when recordSet is not kakenhi", () => {
    const project: Project = { ...mockProject, recordSet: "nrid" }
    const result = kakenProjectToDmpProjectInfo(project)

    expect(result.fundingAgency).toBe("")
    expect(result.programName).toBe("")
    expect(result.programCode).toBe("")
  })

  it("returns empty strings for agency/program/code when recordSet is undefined", () => {
    const project: Project = { ...mockProject, recordSet: undefined }
    const result = kakenProjectToDmpProjectInfo(project)

    expect(result.fundingAgency).toBe("")
    expect(result.programName).toBe("")
    expect(result.programCode).toBe("")
  })

  it("falls back to programCode + awardNumber when nationalAwardNumber identifier is absent", () => {
    const project: Project = { ...mockProject, identifiers: [] }
    const result = kakenProjectToDmpProjectInfo(project)

    expect(result.projectCode).toBe("JP23K12345")
  })

  it("falls back to programCode + awardNumber when identifiers contains no nationalAwardNumber", () => {
    const project: Project = {
      ...mockProject,
      identifiers: [{ type: "doi", value: "10.xxxx/test" }],
    }
    const result = kakenProjectToDmpProjectInfo(project)

    expect(result.projectCode).toBe("JP23K12345")
  })

  it("falls back to programCode + awardNumber when identifiers is undefined", () => {
    const project: Project = { ...mockProject, identifiers: undefined }
    const result = kakenProjectToDmpProjectInfo(project)

    expect(result.projectCode).toBe("JP23K12345")
  })

  it("uses empty string for projectCode when identifiers absent and awardNumber is undefined", () => {
    const project: Project = { ...mockProject, identifiers: undefined, awardNumber: undefined }
    const result = kakenProjectToDmpProjectInfo(project)

    expect(result.projectCode).toBe("JP")
  })

  it("handles missing periodOfAward", () => {
    const project: Project = { ...mockProject, periodOfAward: undefined }
    const result = kakenProjectToDmpProjectInfo(project)

    expect(result.startYear).toBe("")
    expect(result.endYear).toBe("")
  })

  it("derives adoptionYear from created date", () => {
    const project: Project = { ...mockProject, created: new Date("2021-10-15") }
    const result = kakenProjectToDmpProjectInfo(project)

    expect(result.adoptionYear).toBe("2021")
  })

  it("returns empty adoptionYear when created is undefined", () => {
    const project: Project = { ...mockProject, created: undefined }
    const result = kakenProjectToDmpProjectInfo(project)

    expect(result.adoptionYear).toBe("")
  })

  it("uses searchStartFiscalYear and searchEndFiscalYear for startYear and endYear", () => {
    const project: Project = {
      ...mockProject,
      periodOfAward: {
        startFiscalYear: 2020,
        endFiscalYear: 2025,
        searchStartFiscalYear: 2023,
        searchEndFiscalYear: 2026,
      },
    }
    const result = kakenProjectToDmpProjectInfo(project)

    expect(result.startYear).toBe("2023")
    expect(result.endYear).toBe("2026")
  })

  it("handles missing title", () => {
    const project: Project = { ...mockProject, title: undefined }
    const result = kakenProjectToDmpProjectInfo(project)

    expect(result.projectName).toBe("")
  })
})

describe("useKakenProject", () => {
  beforeEach(() => {
    mockSearch.mockReset()
    vi.mocked(KakenApiClient).mockClear()
  })

  it("does not fetch on initial render (enabled: false)", () => {
    const { result } = renderHook(() => useKakenProject("23K12345"), { wrapper: createWrapper() })

    expect(result.current.isFetching).toBe(false)
    expect(mockSearch).not.toHaveBeenCalled()
  })

  it("fetches and maps data when refetch is called", async () => {
    const mockResponse: ProjectsResponse = {
      rawData: {},
      projects: [mockProject],
      totalResults: 1,
    }
    mockSearch.mockResolvedValueOnce(mockResponse)

    const { result } = renderHook(() => useKakenProject("23K12345"), { wrapper: createWrapper() })

    const queryResult = await result.current.refetch()

    expect(queryResult.isSuccess).toBe(true)
    expect(mockSearch).toHaveBeenCalledWith({ projectNumber: "23K12345" })
    expect(queryResult.data?.projectCode).toBe("JP23K12345")
    expect(queryResult.data?.projectName).toBe("テスト研究プロジェクト")
    expect(queryResult.data?.fundingAgency).toBe("日本学術振興会")
  })

  it("passes appId from KAKEN_APP_ID to KakenApiClient constructor", async () => {
    const mockResponse: ProjectsResponse = {
      rawData: {},
      projects: [mockProject],
      totalResults: 1,
    }
    mockSearch.mockResolvedValueOnce(mockResponse)

    const { result } = renderHook(() => useKakenProject("23K12345"), { wrapper: createWrapper() })
    await result.current.refetch()

    // appId is passed from the KAKEN_APP_ID build-time constant (empty string becomes undefined)
    // fetchFn rewrites KAKEN/NRID URLs to proxy paths to avoid CORS issues
    expect(vi.mocked(KakenApiClient)).toHaveBeenCalledWith({
      useCache: false,
      appId: import.meta.env.VITE_KAKEN_APP_ID || undefined,
      fetchFn: expect.any(Function),
    })
  })

  it("returns null when no projects found", async () => {
    const mockResponse: ProjectsResponse = {
      rawData: {},
      projects: [],
      totalResults: 0,
    }
    mockSearch.mockResolvedValueOnce(mockResponse)

    const { result } = renderHook(() => useKakenProject("99Z99999"), { wrapper: createWrapper() })

    const queryResult = await result.current.refetch()

    expect(queryResult.isSuccess).toBe(true)
    expect(queryResult.data).toBeNull()
  })
})
