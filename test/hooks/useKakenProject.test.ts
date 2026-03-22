import "../../src/vite-env.d.ts"
import { KakenApiClient } from "@hirakinii-packages/kaken-api-client-typescript"
import type { Project, ProjectsResponse, ResearcherRole } from "@hirakinii-packages/kaken-api-client-typescript"
import { QueryClient, QueryClientProvider } from "@tanstack/react-query"
import { renderHook } from "@testing-library/react"
import { createElement } from "react"
import { describe, it, expect, vi, beforeEach } from "vitest"

import { kakenProjectToDmpProjectInfo, kakenMembersToPersonInfos, useKakenProject } from "../../src/hooks/useKakenProject"

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

describe("kakenMembersToPersonInfos", () => {
  const principalMember: ResearcherRole = {
    role: "principal_investigator",
    name: { fullName: "山田 太郎", familyName: "山田", givenName: "太郎" },
    eradCode: "1234567890",
    affiliations: [{ institution: { name: "東京大学" } }],
  }
  const coMember: ResearcherRole = {
    role: "co_investigator_buntan",
    name: { fullName: "田中 花子", familyName: "田中", givenName: "花子" },
    affiliations: [{ institution: { name: "京都大学" } }],
  }
  const unknownMember: ResearcherRole = {
    role: "other_role",
    name: { fullName: "佐藤 次郎", familyName: "佐藤", givenName: "次郎" },
  }

  it("maps principal_investigator to 研究代表者 role", () => {
    const results = kakenMembersToPersonInfos([principalMember])
    expect(results).toHaveLength(1)
    expect(results[0].role).toEqual(["研究代表者"])
  })

  it("maps co_investigator_buntan to 研究分担者 role", () => {
    const results = kakenMembersToPersonInfos([coMember])
    expect(results).toHaveLength(1)
    expect(results[0].role).toEqual(["研究分担者"])
  })

  it("skips members with unrecognized roles", () => {
    const results = kakenMembersToPersonInfos([unknownMember])
    expect(results).toHaveLength(0)
  })

  it("maps name fields correctly", () => {
    const results = kakenMembersToPersonInfos([principalMember])
    expect(results[0].lastName).toBe("山田")
    expect(results[0].firstName).toBe("太郎")
  })

  it("maps eradCode to eRadResearcherId", () => {
    const results = kakenMembersToPersonInfos([principalMember])
    expect(results[0].eRadResearcherId).toBe("1234567890")
  })

  it("maps first affiliation institution name to affiliation", () => {
    const results = kakenMembersToPersonInfos([principalMember])
    expect(results[0].affiliation).toBe("東京大学")
  })

  it("sets source fields to 'kaken'", () => {
    const results = kakenMembersToPersonInfos([principalMember])
    expect(results[0].source?.role).toBe("kaken")
    expect(results[0].source?.lastName).toBe("kaken")
    expect(results[0].source?.firstName).toBe("kaken")
    expect(results[0].source?.eRadResearcherId).toBe("kaken")
    expect(results[0].source?.affiliation).toBe("kaken")
  })

  it("handles missing name gracefully (empty strings)", () => {
    const member: ResearcherRole = { role: "principal_investigator" }
    const results = kakenMembersToPersonInfos([member])
    expect(results[0].lastName).toBe("")
    expect(results[0].firstName).toBe("")
  })

  it("handles missing affiliations gracefully (empty affiliation)", () => {
    const member: ResearcherRole = {
      role: "co_investigator_buntan",
      name: { fullName: "田中 花子", familyName: "田中", givenName: "花子" },
      affiliations: [],
    }
    const results = kakenMembersToPersonInfos([member])
    expect(results[0].affiliation).toBe("")
  })

  it("processes multiple members in order", () => {
    const results = kakenMembersToPersonInfos([principalMember, coMember])
    expect(results).toHaveLength(2)
    expect(results[0].lastName).toBe("山田")
    expect(results[1].lastName).toBe("田中")
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
    expect(queryResult.data?.projectInfo.projectCode).toBe("JP23K12345")
    expect(queryResult.data?.projectInfo.projectName).toBe("テスト研究プロジェクト")
    expect(queryResult.data?.projectInfo.fundingAgency).toBe("日本学術振興会")
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

  it("returns personInfos from project members alongside projectInfo", async () => {
    const projectWithMembers: Project = {
      ...mockProject,
      members: [
        {
          role: "principal_investigator",
          name: { fullName: "山田 太郎", familyName: "山田", givenName: "太郎" },
          affiliations: [{ institution: { name: "東京大学" } }],
        },
        {
          role: "co_investigator_buntan",
          name: { fullName: "田中 花子", familyName: "田中", givenName: "花子" },
          affiliations: [{ institution: { name: "京都大学" } }],
        },
      ],
    }
    const mockResponse: ProjectsResponse = {
      rawData: {},
      projects: [projectWithMembers],
      totalResults: 1,
    }
    mockSearch.mockResolvedValueOnce(mockResponse)

    const { result } = renderHook(() => useKakenProject("23K12345"), { wrapper: createWrapper() })
    const queryResult = await result.current.refetch()

    expect(queryResult.isSuccess).toBe(true)
    expect(queryResult.data?.personInfos).toHaveLength(2)
    expect(queryResult.data?.personInfos[0].role).toEqual(["研究代表者"])
    expect(queryResult.data?.personInfos[1].role).toEqual(["研究分担者"])
  })

  it("returns empty personInfos when members is undefined", async () => {
    const mockResponse: ProjectsResponse = {
      rawData: {},
      projects: [{ ...mockProject, members: undefined }],
      totalResults: 1,
    }
    mockSearch.mockResolvedValueOnce(mockResponse)

    const { result } = renderHook(() => useKakenProject("23K12345"), { wrapper: createWrapper() })
    const queryResult = await result.current.refetch()

    expect(queryResult.data?.personInfos).toEqual([])
  })
})
