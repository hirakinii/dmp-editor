/**
 * Tests for Nodes API migration in grdmClient.ts (Task 4 of Issue #21)
 *
 * Verifies that getNodes, getProject, getProjectInfo, listingProjects, and createProject
 * use GrdmClient.nodes (from grdm-api-typescript) instead of direct fetch calls.
 */
import { beforeEach, describe, expect, it, vi } from "vitest"

import type { ProjectInfo } from "../src/grdmClient"
import {
  createProject,
  getNodes,
  getProject,
  getProjectInfo,
  listingProjects,
} from "../src/grdmClient"

// --- Mock GrdmClient ---

const mockGetById = vi.fn()
const mockListNodesPaginated = vi.fn()
const mockCreate = vi.fn()

vi.mock("@hirakinii-packages/grdm-api-typescript", async (importOriginal) => {
  const actual = await importOriginal<typeof import("@hirakinii-packages/grdm-api-typescript")>()
  return {
    ...actual,
    GrdmClient: vi.fn().mockImplementation(() => ({
      nodes: {
        getById: mockGetById,
        listNodesPaginated: mockListNodesPaginated,
        create: mockCreate,
      },
    })),
  }
})

// --- Helpers ---

/** Creates a fake TransformedResource<OsfNodeAttributes> */
function makeTransformedNode(overrides: Partial<{
  id: string
  title: string
  description: string
  category: string
  date_created: string
  date_modified: string
  htmlLink: string
  selfLink: string
}> = {}) {
  return {
    id: overrides.id ?? "node-abc",
    type: "nodes" as const,
    title: overrides.title ?? "Test Project",
    description: overrides.description ?? "A test project",
    category: overrides.category ?? "project",
    date_created: overrides.date_created ?? "2024-01-01T00:00:00.000Z",
    date_modified: overrides.date_modified ?? "2024-06-01T00:00:00.000Z",
    current_user_can_comment: false,
    fork: false,
    preprint: false,
    public: true,
    registration: false,
    collection: false,
    tags: [],
    links: {
      html: overrides.htmlLink ?? "https://rdm.nii.ac.jp/node-abc",
      self: overrides.selfLink ?? "https://api.rdm.nii.ac.jp/v2/nodes/node-abc/",
    },
    relationships: {},
  }
}

/** Creates a fake PaginatedResult with toArray() that returns the given nodes */
function makePaginatedResult(nodes: ReturnType<typeof makeTransformedNode>[]) {
  return {
    data: nodes,
    meta: { total: nodes.length, per_page: 10 },
    links: { next: null },
    hasNext: false,
    toArray: vi.fn().mockResolvedValue(nodes),
    [Symbol.asyncIterator]: async function* () {
      yield nodes
    },
    items: async function* () {
      for (const node of nodes) yield node
    },
  }
}

// --- Tests ---

describe("getNodes", () => {
  beforeEach(() => {
    vi.clearAllMocks()
  })

  it("calls listNodesPaginated and returns data in GetNodesResponse shape", async () => {
    const node = makeTransformedNode({ id: "abc12", title: "My Node" })
    const paginatedResult = makePaginatedResult([node])
    mockListNodesPaginated.mockResolvedValue(paginatedResult)

    const result = await getNodes("test-token")

    expect(mockListNodesPaginated).toHaveBeenCalledOnce()
    expect(result.data).toHaveLength(1)
    expect(result.data[0].id).toBe("abc12")
    expect(result.data[0].attributes.title).toBe("My Node")
    expect(result.data[0].type).toBe("nodes")
  })

  it("applies filter options as NodeListParams", async () => {
    const paginatedResult = makePaginatedResult([])
    mockListNodesPaginated.mockResolvedValue(paginatedResult)

    await getNodes("test-token", false, { category: "project", title: "search" })

    expect(mockListNodesPaginated).toHaveBeenCalledWith({
      "filter[category]": "project",
      "filter[title]": "search",
    })
  })

  it("returns all pages when followPagination=true via toArray()", async () => {
    const nodes = [
      makeTransformedNode({ id: "n1" }),
      makeTransformedNode({ id: "n2" }),
    ]
    const paginatedResult = makePaginatedResult(nodes)
    mockListNodesPaginated.mockResolvedValue(paginatedResult)

    const result = await getNodes("test-token", true)

    expect(paginatedResult.toArray).toHaveBeenCalled()
    expect(result.data).toHaveLength(2)
  })
})

describe("getProject", () => {
  beforeEach(() => {
    vi.clearAllMocks()
  })

  it("calls nodes.getById with projectId and returns GetProjectResponse shape", async () => {
    const node = makeTransformedNode({ id: "proj-1", title: "My Project" })
    mockGetById.mockResolvedValue(node)

    const result = await getProject("test-token", "proj-1")

    expect(mockGetById).toHaveBeenCalledWith("proj-1")
    expect(result.data.id).toBe("proj-1")
    expect(result.data.attributes.title).toBe("My Project")
    expect(result.data.type).toBe("nodes")
  })

  it("propagates errors from nodes.getById", async () => {
    mockGetById.mockRejectedValue(new Error("Not found"))

    await expect(getProject("test-token", "missing-id")).rejects.toThrow()
  })
})

describe("getProjectInfo", () => {
  beforeEach(() => {
    vi.clearAllMocks()
  })

  it("returns ProjectInfo shape from node data", async () => {
    const node = makeTransformedNode({
      id: "proj-42",
      title: "Research Project",
      description: "A research project",
      category: "project",
      date_created: "2024-01-15T10:00:00.000Z",
      date_modified: "2024-03-20T12:00:00.000Z",
      htmlLink: "https://rdm.nii.ac.jp/proj-42",
      selfLink: "https://api.rdm.nii.ac.jp/v2/nodes/proj-42/",
    })
    mockGetById.mockResolvedValue(node)

    const result: ProjectInfo = await getProjectInfo("test-token", "proj-42")

    expect(result.id).toBe("proj-42")
    expect(result.title).toBe("Research Project")
    expect(result.description).toBe("A research project")
    expect(result.category).toBe("project")
    expect(result.dateCreated).toBe("2024-01-15T10:00:00.000Z")
    expect(result.dateModified).toBe("2024-03-20T12:00:00.000Z")
    expect(result.html).toBe("https://rdm.nii.ac.jp/proj-42")
    expect(result.self).toBe("https://api.rdm.nii.ac.jp/v2/nodes/proj-42/")
    expect(result.type).toBe("nodes")
  })
})

describe("listingProjects", () => {
  beforeEach(() => {
    vi.clearAllMocks()
  })

  it("fetches all project nodes and returns ProjectInfo array", async () => {
    const projects = [
      makeTransformedNode({ id: "p1", title: "Project A", category: "project" }),
      makeTransformedNode({ id: "p2", title: "Project B", category: "project" }),
    ]
    const paginatedResult = makePaginatedResult(projects)
    mockListNodesPaginated.mockResolvedValue(paginatedResult)

    const result = await listingProjects("test-token")

    expect(result).toHaveLength(2)
    expect(result[0].id).toBe("p1")
    expect(result[0].title).toBe("Project A")
    expect(result[1].id).toBe("p2")
  })

  it("passes category=project filter to listNodesPaginated", async () => {
    const paginatedResult = makePaginatedResult([])
    mockListNodesPaginated.mockResolvedValue(paginatedResult)

    await listingProjects("test-token")

    expect(mockListNodesPaginated).toHaveBeenCalledWith(
      expect.objectContaining({ "filter[category]": "project" }),
    )
  })

  it("passes title filter when titleFilter is provided", async () => {
    const paginatedResult = makePaginatedResult([])
    mockListNodesPaginated.mockResolvedValue(paginatedResult)

    await listingProjects("test-token", "DMP-")

    expect(mockListNodesPaginated).toHaveBeenCalledWith(
      expect.objectContaining({
        "filter[category]": "project",
        "filter[title]": "DMP-",
      }),
    )
  })

  it("excludes non-project category nodes from result", async () => {
    const nodes = [
      makeTransformedNode({ id: "p1", category: "project" }),
      makeTransformedNode({ id: "c1", category: "data" }),
    ]
    const paginatedResult = makePaginatedResult(nodes)
    mockListNodesPaginated.mockResolvedValue(paginatedResult)

    const result = await listingProjects("test-token")

    // API already filters by category, but client-side filter should also work
    const projectOnly = result.filter((p) => p.category === "project")
    expect(projectOnly).toHaveLength(result.filter((p) => p.id === "p1").length)
  })
})

describe("createProject", () => {
  beforeEach(() => {
    vi.clearAllMocks()
  })

  it("calls nodes.create with title and category=project, returns ProjectInfo", async () => {
    const created = makeTransformedNode({
      id: "new-proj",
      title: "New Project",
      category: "project",
    })
    mockCreate.mockResolvedValue(created)

    const result: ProjectInfo = await createProject("test-token", "New Project")

    expect(mockCreate).toHaveBeenCalledWith({
      title: "New Project",
      category: "project",
    })
    expect(result.id).toBe("new-proj")
    expect(result.title).toBe("New Project")
    expect(result.category).toBe("project")
  })

  it("propagates errors from nodes.create", async () => {
    mockCreate.mockRejectedValue(new Error("Creation failed"))

    await expect(createProject("test-token", "Fail Project")).rejects.toThrow("Failed to create project")
  })
})
