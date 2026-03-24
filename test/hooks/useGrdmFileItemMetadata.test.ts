import type { GrdmFileMetadataResponse } from "@hirakinii-packages/grdm-api-typescript"
import { QueryClient, QueryClientProvider } from "@tanstack/react-query"
import { renderHook } from "@testing-library/react"
import { createElement } from "react"
import { describe, it, expect, vi, beforeEach, afterEach } from "vitest"

import { stripProviderPrefix, useGrdmFileItemMetadata } from "../../src/hooks/useGrdmFileItemMetadata"

// Mock Recoil token
vi.mock("recoil", async (importOriginal) => {
  const actual = await importOriginal<typeof import("recoil")>()
  return {
    ...actual,
    useRecoilValue: () => "test-token",
  }
})

function createWrapper() {
  const queryClient = new QueryClient({ defaultOptions: { queries: { retry: false } } })
  return ({ children }: { children: React.ReactNode }) =>
    createElement(QueryClientProvider, { client: queryClient }, children)
}

// ---------------------------------------------------------------------------
// Unit tests for stripProviderPrefix
// ---------------------------------------------------------------------------
describe("stripProviderPrefix", () => {
  it("strips osfstorage provider prefix", () => {
    expect(stripProviderPrefix("osfstorage/file.csv")).toBe("file.csv")
  })

  it("strips googledrive provider prefix", () => {
    expect(stripProviderPrefix("googledrive/file.csv")).toBe("file.csv")
  })

  it("strips s3 provider prefix", () => {
    expect(stripProviderPrefix("s3/path/to/file.csv")).toBe("path/to/file.csv")
  })

  it("preserves subdirectory path after provider", () => {
    expect(stripProviderPrefix("osfstorage/subdir/nested/file.csv")).toBe("subdir/nested/file.csv")
  })

  it("returns the original string when there is no slash", () => {
    expect(stripProviderPrefix("file.csv")).toBe("file.csv")
  })

  it("handles path with leading slash stripped already", () => {
    expect(stripProviderPrefix("osfstorage/data.csv")).toBe("data.csv")
  })
})

// ---------------------------------------------------------------------------
// Integration tests for useGrdmFileItemMetadata
// ---------------------------------------------------------------------------
const makeResponse = (files: GrdmFileMetadataResponse["data"]["attributes"]["files"]): GrdmFileMetadataResponse => ({
  data: {
    id: "project-abc",
    type: "grdm-file-metadata",
    attributes: { editable: true, features: {}, files },
  },
})

const baseFile = {
  hash: null,
  folder: false,
  urlpath: "/project-abc/files/osfstorage/file.csv",
  generated: false,
  items: [],
}

describe("useGrdmFileItemMetadata", () => {
  let fetchSpy: ReturnType<typeof vi.spyOn>

  beforeEach(() => {
    fetchSpy = vi.spyOn(globalThis, "fetch")
  })

  afterEach(() => {
    fetchSpy.mockRestore()
  })

  it("returns null when projectId is not provided", () => {
    const { result } = renderHook(() => useGrdmFileItemMetadata(null, "/file.csv"), {
      wrapper: createWrapper(),
    })
    expect(result.current.isFetching).toBe(false)
  })

  it("returns null when filePath is not provided", () => {
    const { result } = renderHook(() => useGrdmFileItemMetadata("project-abc", null), {
      wrapper: createWrapper(),
    })
    expect(result.current.isFetching).toBe(false)
  })

  it("finds a file when provider is osfstorage", async () => {
    const targetFile = { ...baseFile, path: "osfstorage/data.csv" }
    fetchSpy.mockResolvedValueOnce(new Response(JSON.stringify(makeResponse([targetFile])), { status: 200 }))

    const { result } = renderHook(
      () => useGrdmFileItemMetadata("project-abc", "data.csv"),
      { wrapper: createWrapper() },
    )
    const queryResult = await result.current.refetch()

    expect(queryResult.isSuccess).toBe(true)
    expect(queryResult.data).toEqual(targetFile)
  })

  it("finds a file when provider is googledrive", async () => {
    const targetFile = { ...baseFile, path: "googledrive/report.pdf", urlpath: "/project-abc/files/googledrive/report.pdf" }
    fetchSpy.mockResolvedValueOnce(new Response(JSON.stringify(makeResponse([targetFile])), { status: 200 }))

    const { result } = renderHook(
      () => useGrdmFileItemMetadata("project-abc", "report.pdf"),
      { wrapper: createWrapper() },
    )
    const queryResult = await result.current.refetch()

    expect(queryResult.isSuccess).toBe(true)
    expect(queryResult.data).toEqual(targetFile)
  })

  it("returns null when no file matches the given path", async () => {
    const otherFile = { ...baseFile, path: "osfstorage/other.csv" }
    fetchSpy.mockResolvedValueOnce(new Response(JSON.stringify(makeResponse([otherFile])), { status: 200 }))

    const { result } = renderHook(
      () => useGrdmFileItemMetadata("project-abc", "data.csv"),
      { wrapper: createWrapper() },
    )
    const queryResult = await result.current.refetch()

    expect(queryResult.isSuccess).toBe(true)
    expect(queryResult.data).toBeNull()
  })

  it("strips leading slash from filePath before matching", async () => {
    const targetFile = { ...baseFile, path: "osfstorage/file.csv" }
    fetchSpy.mockResolvedValueOnce(new Response(JSON.stringify(makeResponse([targetFile])), { status: 200 }))

    const { result } = renderHook(
      () => useGrdmFileItemMetadata("project-abc", "/file.csv"),
      { wrapper: createWrapper() },
    )
    const queryResult = await result.current.refetch()

    expect(queryResult.isSuccess).toBe(true)
    expect(queryResult.data).toEqual(targetFile)
  })

  it("transitions to error state when API returns non-ok response", async () => {
    fetchSpy.mockResolvedValueOnce(new Response("Internal Server Error", { status: 500, statusText: "Internal Server Error" }))

    const { result } = renderHook(
      () => useGrdmFileItemMetadata("project-abc", "file.csv"),
      { wrapper: createWrapper() },
    )
    const queryResult = await result.current.refetch()

    expect(queryResult.isError).toBe(true)
    expect((queryResult.error as Error).message).toContain("GRDM v1 API error: 500")
  })
})
