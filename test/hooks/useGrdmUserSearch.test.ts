import "../../src/vite-env.d.ts"
import { GrdmClient } from "@hirakinii-packages/grdm-api-typescript"
import { QueryClient, QueryClientProvider } from "@tanstack/react-query"
import { renderHook, act, waitFor } from "@testing-library/react"
import type { OsfUserAttributes, TransformedResource } from "osf-api-v2-typescript"
import { createElement } from "react"
import { RecoilRoot } from "recoil"
import { describe, it, expect, vi, beforeEach } from "vitest"

import { toGrdmUserSearchResult, useGrdmUserSearch } from "../../src/hooks/useGrdmUserSearch"

// Mock GrdmClient
const mockListUsers = vi.fn()

vi.mock("@hirakinii-packages/grdm-api-typescript", () => ({
  GrdmClient: vi.fn().mockImplementation(() => ({
    users: { listUsers: mockListUsers },
  })),
}))

// Mock recoil tokenAtom
vi.mock("recoil", async () => {
  const actual = await vi.importActual<typeof import("recoil")>("recoil")
  return {
    ...actual,
    useRecoilValue: vi.fn().mockReturnValue("test-token"),
  }
})

function createWrapper() {
  const queryClient = new QueryClient({ defaultOptions: { queries: { retry: false } } })
  return ({ children }: { children: React.ReactNode }) =>
    createElement(
      RecoilRoot,
      null,
      createElement(QueryClientProvider, { client: queryClient }, children),
    )
}

const mockUserAttributes: OsfUserAttributes = {
  full_name: "Yamada Taro",
  given_name: "Taro",
  middle_names: "",
  family_name: "Yamada",
  suffix: "",
  date_registered: "2020-01-01",
  active: true,
  social: { orcid: "0000-0001-2345-6789" },
  employment: [
    {
      institution: "Tokyo University",
      ongoing: true,
    },
  ],
}

const mockUser: TransformedResource<OsfUserAttributes> = {
  id: "user123",
  type: "users" as const,
  ...mockUserAttributes,
  links: { self: "", html: "" },
}

describe("toGrdmUserSearchResult", () => {
  it("maps id and name fields correctly", () => {
    const result = toGrdmUserSearchResult(mockUser)
    expect(result.id).toBe("user123")
    expect(result.familyName).toBe("Yamada")
    expect(result.givenName).toBe("Taro")
  })

  it("maps orcid from social field", () => {
    const result = toGrdmUserSearchResult(mockUser)
    expect(result.orcid).toBe("0000-0001-2345-6789")
  })

  it("maps first employment institution to affiliation", () => {
    const result = toGrdmUserSearchResult(mockUser)
    expect(result.affiliation).toBe("Tokyo University")
  })

  it("returns null orcid when social is undefined", () => {
    const user = { ...mockUser, social: undefined }
    const result = toGrdmUserSearchResult(user)
    expect(result.orcid).toBeNull()
  })

  it("returns null affiliation when employment is empty", () => {
    const user = { ...mockUser, employment: [] }
    const result = toGrdmUserSearchResult(user)
    expect(result.affiliation).toBeNull()
  })

  it("returns null affiliation when employment is undefined", () => {
    const user = { ...mockUser, employment: undefined }
    const result = toGrdmUserSearchResult(user)
    expect(result.affiliation).toBeNull()
  })
})

describe("useGrdmUserSearch", () => {
  beforeEach(() => {
    mockListUsers.mockReset()
    vi.mocked(GrdmClient).mockClear()
  })

  it("returns empty users array on initial render", () => {
    const { result } = renderHook(() => useGrdmUserSearch(), { wrapper: createWrapper() })
    expect(result.current.users).toEqual([])
  })

  it("does not fetch until search() is called", () => {
    renderHook(() => useGrdmUserSearch(), { wrapper: createWrapper() })
    expect(mockListUsers).not.toHaveBeenCalled()
  })

  it("calls listUsers with filter[family_name] when search() is called", async () => {
    mockListUsers.mockResolvedValueOnce({ data: [] })

    const { result } = renderHook(() => useGrdmUserSearch(), { wrapper: createWrapper() })

    await act(async () => {
      result.current.setFamilyName("Yamada")
    })
    await act(async () => {
      await result.current.search()
    })

    expect(mockListUsers).toHaveBeenCalledWith({ "filter[family_name]": "Yamada" })
  })

  it("returns mapped users after search", async () => {
    mockListUsers.mockResolvedValueOnce({ data: [mockUser] })

    const { result } = renderHook(() => useGrdmUserSearch(), { wrapper: createWrapper() })

    await act(async () => {
      result.current.setFamilyName("Yamada")
    })
    await act(async () => {
      await result.current.search()
    })

    await waitFor(() => expect(result.current.users).toHaveLength(1))
    expect(result.current.users[0].id).toBe("user123")
    expect(result.current.users[0].familyName).toBe("Yamada")
  })
})
