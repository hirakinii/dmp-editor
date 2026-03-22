/**
 * GRDM API client — DMP file operation layer.
 *
 * Responsibility: This module is the dedicated client for DMP file operations on GRDM storage.
 * It owns the logic for reading/writing the DMP JSON file (`dmp-project.json`) and the
 * file-system traversal utilities (`getFiles`, `findFilesNode`, `readFile`, `writeFile`)
 * that support those operations.
 *
 * Functions that interact with GRDM Nodes API (`getNodes`, `getProject`, `listingProjects`,
 * `createProject`) remain here as thin compatibility wrappers around
 * `@hirakinii-packages/grdm-api-typescript`; they are kept to avoid breaking existing callers.
 *
 * `getMe` / `authenticateGrdm` use raw fetch because `OsfClient.users.me()` does not return
 * the Japanese name fields (`family_name_ja`, `given_name_ja`) that GRDM provides.
 */
import type { NodeListParams, OsfNodeAttributes, TransformedResource } from "@hirakinii-packages/grdm-api-typescript"
import { GrdmClient } from "@hirakinii-packages/grdm-api-typescript"
import { z } from "zod"

import { GRDM_CONFIG } from "@/config"
import { Dmp, dmpSchema } from "@/dmp"

export const DMP_FILE_NAME = "dmp-project.json"
export const DMP_PROJECT_PREFIX = "DMP-"
const DMP_FILE_CHECK_CONCURRENCY = 4
const GRDM_API_BASE_URL = GRDM_CONFIG.API_BASE_URL

/**
 * Fetch wrapper with automatic retry and timeout.
 *
 * Kept because `@hirakinii-packages/grdm-api-typescript`'s internal `HttpClient` does not
 * implement retry logic: it performs a single fetch and throws on failure.
 * This wrapper adds:
 *   - Up to 5 retries with a 1-second delay between attempts
 *   - Explicit handling of HTTP 429 (Too Many Requests)
 *   - A 10-second per-request timeout via `AbortController`
 *
 * Used by: `authenticateGrdm`, `getMe`, `getFiles`, `readFile`, `writeFile`
 */
const fetchWithRetry = async (
  url: string,
  options: RequestInit = {},
  retries = 5,
  timeout = 10000, // 10 seconds
): Promise<Response> => {
  for (let attempt = 0; attempt < retries; attempt++) {
    const controller = new AbortController()
    const timeoutId = setTimeout(() => controller.abort(), timeout)

    try {
      const response = await fetch(url, {
        ...options,
        signal: controller.signal,
      })

      clearTimeout(timeoutId)
      if (response.status === 429) {
        if (attempt < retries) {
          console.warn("Too many requests (429) - Retrying in 1s")
          await new Promise((resolve) => setTimeout(resolve, 1000))
          continue
        } else {
          throw new Error("Too many requests (429) - Max retries exceeded")
        }
      }

      return response
    } catch (error) {
      clearTimeout(timeoutId)
      if (attempt < retries) {
        console.warn("Failed to fetch - Retrying in 1s", error)
        await new Promise((resolve) => setTimeout(resolve, 1000))
        continue
      } else {
        throw error
      }
    }
  }

  throw new Error("Unreachable code reached")
}

/** Creates a GrdmClient instance configured for the current GRDM environment */
const createGrdmClient = (token: string) =>
  new GrdmClient({ token, baseUrl: `${GRDM_API_BASE_URL}/` })

/**
 * Converts a TransformedResource<OsfNodeAttributes> (from osf-api-v2-typescript)
 * into the legacy NodeData shape used throughout grdmClient.ts.
 */
const transformedToNodeData = (node: TransformedResource<OsfNodeAttributes>): NodeData => ({
  id: node.id,
  type: "nodes",
  attributes: {
    title: node.title,
    description: node.description,
    category: node.category,
    date_created: node.date_created,
    date_modified: node.date_modified,
  },
  relationships: (node.relationships as NodeData["relationships"]) ?? {},
  links: {
    html: node.links?.html ?? "",
    self: node.links?.self ?? "",
  },
})

/**
 * Converts ProjectOrComponentNodeFilterOptions to NodeListParams
 * (the format expected by osf-api-v2-typescript's Nodes resource).
 */
const filterOptionsToNodeListParams = (
  filterOptions?: ProjectOrComponentNodeFilterOptions,
): NodeListParams => {
  if (!filterOptions) return {}

  const params: NodeListParams = {}

  if (filterOptions.id !== undefined && filterOptions.id !== "") {
    params["filter[id]"] = filterOptions.id
  }
  if (filterOptions.category !== undefined) {
    params["filter[category]"] = filterOptions.category
  }
  if (filterOptions.title !== undefined && filterOptions.title !== "") {
    params["filter[title]"] = filterOptions.title
  }
  if (filterOptions.description !== undefined && filterOptions.description !== "") {
    params["filter[description]"] = filterOptions.description
  }
  if (filterOptions.public !== undefined) {
    params["filter[public]"] = filterOptions.public
  }
  if (filterOptions.tags !== undefined) {
    params["filter[tags]"] = Array.isArray(filterOptions.tags)
      ? filterOptions.tags.join(",")
      : filterOptions.tags
  }
  if (filterOptions.date_created !== undefined && filterOptions.date_created !== "") {
    params["filter[date_created]"] = filterOptions.date_created
  }
  if (filterOptions.date_modified !== undefined && filterOptions.date_modified !== "") {
    params["filter[date_modified]"] = filterOptions.date_modified
  }

  return params
}

export const authenticateGrdm = async (token: string): Promise<boolean> => {
  const url = `${GRDM_API_BASE_URL}/users/me/`

  try {
    const response = await fetchWithRetry(url, {
      headers: {
        Authorization: `Bearer ${token}`,
        "Content-Type": "application/json",
      },
    })

    return response.ok
  } catch (error) {
    throw new Error("Failed to authenticate with GRDM API", { cause: error })
  }
}

export interface GetMeResponse {
  data: {
    id: string
    attributes: {
      full_name: string
      given_name: string
      family_name: string
      given_name_ja?: string | null
      family_name_ja?: string | null
      social: {
        orcid?: string | null
        researcherId?: string | null
      }
      employment: {
        institution_ja: string
        department_ja: string
      }[]
      timezone: string
      email?: string | null
    }
    links: {
      html: string
      profile_image: string
    }
  }
}

export const getMeResponseSchema = z.object({
  data: z.object({
    id: z.string(),
    attributes: z.object({
      full_name: z.string(),
      given_name: z.string(),
      family_name: z.string(),
      given_name_ja: z.string().optional().nullable(),
      family_name_ja: z.string().optional().nullable(),
      social: z.object({
        orcid: z.string().optional().nullable(),
        researcherId: z.string().optional().nullable(),
      }),
      employment: z.array(z.object({
        institution_ja: z.string(),
        department_ja: z.string(),
      })),
      timezone: z.string(),
      email: z.string().optional().nullable(),
    }),
    links: z.object({
      html: z.string(),
      profile_image: z.string(),
    }),
  }),
})

/* NOTE: OsfClient.users.me() does not return Japanese name fields (family_name_ja, given_name_ja).
Migration to grdm-api-typescript is deferred until the upstream package supports these fields. (Issue #21)
*/
export const getMe = async (token: string): Promise<GetMeResponse> => {
  const url = `${GRDM_API_BASE_URL}/users/me/`

  try {
    const response = await fetchWithRetry(url, {
      headers: {
        Authorization: `Bearer ${token}`,
        "Content-Type": "application/json",
      },
    })
    if (!response.ok) {
      throw new Error(`HTTP Error: ${response.status} ${response.statusText}`)
    }
    const json = await response.json()

    return getMeResponseSchema.parse(json)
  } catch (error) {
    throw new Error("Failed to get user information from GRDM", { cause: error })
  }
}

export interface NodeData {
  id: string
  type: "nodes"
  attributes: {
    title: string
    description: string
    category: string
    date_created: string // "2023-07-04T04:08:12.597030"
    date_modified: string // "2023-07-04T04:08:12.597030"
  }
  relationships: Record<string, {
    links: {
      related: {
        href: string
      }
    }
  }>
  links: {
    html: string
    self: string
  }
}

export interface GetNodesResponse {
  data: NodeData[]
  links: {
    first: string | null
    last: string | null
    prev: string | null
    next: string | null
    meta: {
      total: number
      per_page: number
    }
  }
}

/**
 * Filter options for GRDM API projects/components node queries
 */
export interface ProjectOrComponentNodeFilterOptions {
  /** Filter by node ID */
  id?: string

  /** Filter by category */
  category?:
    | "analysis"
    | "communication"
    | "data"
    | "hypothesis"
    | "instrumentation"
    | "methods and measures"
    | "procedure"
    | "project"
    | "software"
    | "other"

  /** Filter by title */
  title?: string

  /** Filter by description */
  description?: string

  /** Filter by public visibility status */
  public?: boolean

  /** Filter by tags (comma-separated string or array) */
  tags?: string | string[]

  /** Filter by creation date (ISO 8601 format) */
  date_created?: string

  /** Filter by modification date (ISO 8601 format) */
  date_modified?: string

  /** Filter by parent node ID */
  parent?: string

  /** Filter by root node ID */
  root?: string
}

export const getNodes = async (
  token: string,
  followPagination = false,
  filterOptions?: ProjectOrComponentNodeFilterOptions,
): Promise<GetNodesResponse> => {
  try {
    const client = createGrdmClient(token)
    const params = filterOptionsToNodeListParams(filterOptions)
    const paginatedResult = await client.nodes.listNodesPaginated(params)

    const allData = followPagination
      ? await paginatedResult.toArray()
      : paginatedResult.data

    const nodeDataArray = allData.map(transformedToNodeData)

    return {
      data: nodeDataArray,
      links: {
        first: null,
        last: null,
        prev: null,
        next: null,
        meta: {
          total: nodeDataArray.length,
          per_page: nodeDataArray.length,
        },
      },
    }
  } catch (error) {
    throw new Error("Failed to list nodes from GRDM", { cause: error })
  }
}

export interface ProjectInfo {
  id: string
  type: string
  title: string
  description: string
  category: string
  dateCreated: string // "2023-07-04T04:08:12.597030"
  dateModified: string // "2023-07-04T04:08:12.597030"
  html: string
  self: string
}

const nodeToProjectInfo = (node: NodeData): ProjectInfo => ({
  id: node.id,
  type: node.type,
  title: node.attributes.title,
  description: node.attributes.description,
  category: node.attributes.category,
  dateCreated: node.attributes.date_created,
  dateModified: node.attributes.date_modified,
  html: node.links.html,
  self: node.links.self,
})

export const listingProjects = async (
  token: string,
  titleFilter?: string,
): Promise<ProjectInfo[]> => {
  const filterOptions: ProjectOrComponentNodeFilterOptions = {
    category: "project",
    title: titleFilter,
  }
  const response = await getNodes(token, true, filterOptions)
  return response.data
    .map((node) => nodeToProjectInfo(node))
    .filter((project) => project.category === "project")
}

/**
 * Runs tasks with bounded concurrency (at most `limit` workers at a time).
 * Results preserve input order; failures are captured as rejected entries.
 */
async function runWithConcurrency<T>(
  tasks: (() => Promise<T>)[],
  limit: number,
): Promise<PromiseSettledResult<T>[]> {
  const results: PromiseSettledResult<T>[] = new Array(tasks.length)
  let index = 0

  async function worker(): Promise<void> {
    while (index < tasks.length) {
      const i = index++
      try {
        results[i] = { status: "fulfilled", value: await tasks[i]() }
      } catch (error) {
        results[i] = { status: "rejected", reason: error }
      }
    }
  }

  await Promise.all(Array.from({ length: Math.min(limit, tasks.length) }, worker))
  return results
}

/**
 * Returns true if dmp-project.json exists at the root of the project's osfstorage.
 * Returns false on any error (e.g. network error, permission denied).
 */
const hasDmpFile = async (token: string, projectId: string): Promise<boolean> => {
  try {
    const response = await listingFileNodes(token, projectId, null, false)
    return response.data.some((node) => node.attributes.name === DMP_FILE_NAME)
  } catch {
    return false
  }
}

/**
 * Returns GRDM projects managed by DMP Editor:
 *   - title starts with DMP_PROJECT_PREFIX ("DMP-"), AND
 *   - dmp-project.json exists in the project root.
 *
 * File-existence checks are performed with bounded concurrency
 * (DMP_FILE_CHECK_CONCURRENCY workers) to respect GRDM's rate limit (~5 req/s).
 */
export const listingDmpProjects = async (token: string): Promise<ProjectInfo[]> => {
  const candidates = await listingProjects(token, DMP_PROJECT_PREFIX)

  const tasks = candidates.map((project) => () => hasDmpFile(token, project.id))
  const settled = await runWithConcurrency(tasks, DMP_FILE_CHECK_CONCURRENCY)

  return candidates.filter((_, i) => {
    const result = settled[i]
    return result.status === "fulfilled" && result.value === true
  })
}

export const formatDateToTimezone = (dateString: string, timeZone = "Asia/Tokyo"): string => {
  const date = new Date(dateString)

  return new Intl.DateTimeFormat("ja-JP", {
    timeZone,
    year: "numeric",
    month: "2-digit",
    day: "2-digit",
    hour: "2-digit",
    minute: "2-digit",
    second: "2-digit",
    hour12: false,
  }).format(date)
}

export interface GetProjectResponse {
  data: NodeData
}

export const getProject = async (token: string, projectId: string): Promise<GetProjectResponse> => {
  try {
    const client = createGrdmClient(token)
    const node = await client.nodes.getById(projectId)
    return { data: transformedToNodeData(node) }
  } catch (error) {
    console.error("Failed to get project from GRDM", error)
    throw error
  }
}

export const getProjectInfo = async (token: string, projectId: string): Promise<ProjectInfo> => {
  try {
    const response = await getProject(token, projectId)
    return nodeToProjectInfo(response.data)
  } catch (error) {
    throw new Error("Failed to get project information", { cause: error })
  }
}

export interface FilesNode {
  id: string
  type: "files"
  attributes: {
    name: string
    kind: "file" | "folder"
    path: string // unique identifier like /<id>/
    size?: number | null // bytes
    materialized_path?: string // Unix-style path like /something_dir/
    last_touched?: string | null
    date_modified?: string | null
    date_created?: string | null
    extra?: {
      hashes: {
        md5: string | null
        sha256: string | null
      }
    }
    current_version?: number
  }
  relationships: Record<string, { // key: e.g., files
    links: {
      related: {
        href: string
      }
    }
  }>
  links: {
    info?: string
    self?: string
    move?: string
    new_folder?: string
    upload?: string
    download?: string
    delete?: string
  }
}

export const filesNodeSchema = z.object({
  id: z.string(),
  type: z.literal("files"),
  attributes: z.object({
    name: z.string(),
    kind: z.enum(["file", "folder"]),
    path: z.string(),
    size: z.number().nullable().optional(),
    materialized_path: z.string().optional(),
    last_touched: z.string().nullable().optional(),
    date_modified: z.string().nullable().optional(),
    date_created: z.string().nullable().optional(),
    extra: z.object({
      hashes: z.object({
        md5: z.string().nullable(),
        sha256: z.string().nullable(),
      }),
    }).optional(),
    current_version: z.number().optional(),
  }),
  relationships: z.record(
    z.object({
      links: z.object({
        related: z.object({
          href: z.string(),
        }),
      }),
    }),
  ),
  links: z.object({
    info: z.string().optional(),
    self: z.string().optional(),
    move: z.string().optional(),
    new_folder: z.string().optional(),
    upload: z.string().optional(),
    download: z.string().optional(),
    delete: z.string().optional(),
  }),
})

export interface GetFilesResponse {
  data: FilesNode[]
  links: {
    first: string | null
    last: string | null
    prev: string | null
    next: string | null
    meta: {
      total: number
      per_page: number
    }
  }
}

export const getFilesResponseSchema = z.object({
  data: z.array(filesNodeSchema),
  links: z.object({
    first: z.string().nullable(),
    last: z.string().nullable(),
    prev: z.string().nullable(),
    next: z.string().nullable(),
    meta: z.object({
      total: z.number(),
      per_page: z.number(),
    }),
  }),
})

/**
 * Fetches file/folder nodes from an arbitrary WaterButler URL.
 *
 * Kept because `OsfClient.files` only supports a fixed `(nodeId, provider)` URL pattern.
 * This function accepts any URL, which is required by:
 *   - `writeFile` — fetches directories mid-path after auto-creating them
 *   - `findFilesNode` — recurses into sub-folder URLs returned by the API
 *   - `listingFileNodes` — supports `folderNodeId`-based URLs not expressible via the package
 */
export const getFiles = async (token: string, url: string, followPagination = false): Promise<GetFilesResponse> => {
  let allData: GetFilesResponse["data"] = []
  let nextUrl: string | null = url

  try {
    while (nextUrl) {
      const response = await fetchWithRetry(nextUrl, {
        headers: {
          Authorization: `Bearer ${token}`,
          "Content-Type": "application/json",
        },
      })
      if (!response.ok) {
        throw new Error(`HTTP Error: ${response.status} ${response.statusText}`)
      }
      const json = await response.json()
      const parsed = getFilesResponseSchema.parse(json)

      allData = [...allData, ...parsed.data]
      nextUrl = followPagination ? parsed.links.next : null
    }

    return {
      data: allData,
      links: {
        first: null,
        last: null,
        prev: null,
        next: null,
        meta: {
          total: allData.length,
          per_page: allData.length,
        },
      },
    }
  } catch (error) {
    throw new Error("Failed to list files from GRDM", { cause: error })
  }
}

const findFilesNodeFromDataList = (nodes: GetFilesResponse["data"], pathName: string): FilesNode | null => {
  return nodes.find((node) => node.attributes.name === pathName) ?? null
}

/**
 * Resolves a Unix-style path (e.g. `"dir/subdir/file.json"`) to its `FilesNode` by recursively
 * descending through the GRDM osfstorage hierarchy.
 *
 * Kept because `@hirakinii-packages/grdm-api-typescript` provides no equivalent:
 * `OsfClient.files` lists nodes by `(nodeId, provider)` but does not traverse nested paths.
 * This function bridges that gap by following `relationships.files` links level by level.
 */
export const findFilesNode = async (token: string, projectId: string, path: string): Promise<FilesNode> => {
  try {
    const pathArray = path.replace(/^\/+|\/+$/g, "").split("/")

    // Get the root node of the project (from osfstorage)
    let currentUrl = `${GRDM_API_BASE_URL}/nodes/${projectId}/files/osfstorage/`
    let currentNodeList = await getFiles(token, currentUrl, true)
    let currentNode: FilesNode | null = null
    for (const [index, pathName] of pathArray.entries()) {
      currentNode = findFilesNodeFromDataList(currentNodeList.data, pathName)
      if (currentNode === null) {
        throw new Error(`Failed to find node: ${pathArray.slice(0, index + 1).join("/")}`)
      }

      if (index !== pathArray.length - 1) {
        if (currentNode.attributes.kind !== "folder") {
          throw new Error(`Expected a folder but found a file: ${pathArray.slice(0, index + 1).join("/")}`)
        }
        currentUrl = currentNode.relationships.files?.links.related.href ?? ""
        if (currentUrl === "") {
          throw new Error(`No files relationship found for node: ${pathArray.slice(0, index + 1).join("/")}`)
        }
        currentNodeList = await getFiles(token, currentUrl, true)
      }
    }

    if (currentNode === null) {
      throw new Error("Failed to find node: ${path}")
    }

    return currentNode
  } catch (error) {
    throw new Error("Failed to find files node", { cause: error })
  }
}

export const readFile = async (token: string, projectId: string, path: string): Promise<{
  content: string
  node: FilesNode
}> => {
  // path: e.g., path/to/file.txt (no leading or trailing slashes)
  try {
    const node = await findFilesNode(token, projectId, path)
    if (node.attributes.kind !== "file") {
      throw new Error(`Expected a file but found a folder: ${path}`)
    }

    const url = node.links.move ?? node.links.upload ?? node.links.delete
    if (url === undefined) {
      throw new Error(`No download link found for file: ${path}`)
    }

    const response = await fetchWithRetry(url, {
      headers: {
        Authorization: `Bearer ${token}`,
        "Content-Type": "application/json",
      },
    })
    if (!response.ok) {
      throw new Error(`HTTP Error: ${response.status} ${response.statusText}`)
    }

    return {
      content: await response.text(),
      node,
    }
  } catch (error) {
    throw new Error("Failed to read file", { cause: error })
  }
}

export const writeFile = async (token: string, projectId: string, path: string, content: string, update = true): Promise<void> => {
  try {
    const pathArray = path.replace(/^\/+|\/+$/g, "").split("/")
    const fileName = pathArray.pop()
    if (fileName === undefined) {
      throw new Error(`Invalid file path: ${path}`)
    }

    // root node of the project (from osfstorage)
    const rootUrl = `${GRDM_API_BASE_URL}/nodes/${projectId}/files/`
    const rootNodeList = await getFiles(token, rootUrl, true)
    const osfStorageNode = findFilesNodeFromDataList(rootNodeList.data, "osfstorage")
    if (osfStorageNode === null) {
      throw new Error("Failed to find osfstorage node")
    }

    let currentUrl = `${GRDM_API_BASE_URL}/nodes/${projectId}/files/osfstorage/`
    let currentNodeList = await getFiles(token, currentUrl, true)
    let parentNode: FilesNode | null = osfStorageNode

    for (const [index, pathName] of pathArray.entries()) {
      const foundNode = findFilesNodeFromDataList(currentNodeList.data, pathName)
      if (foundNode !== null) {
        parentNode = foundNode
        currentUrl = foundNode.relationships.files?.links.related.href ?? ""
        if (currentUrl === "") {
          throw new Error(`No files relationship found for node: ${pathArray.slice(0, index + 1).join("/")}`)
        }
        currentNodeList = await getFiles(token, currentUrl, true)
      } else {
        // Node not found, create a new node (directory)
        if (parentNode === null || parentNode.links.new_folder === undefined) {
          throw new Error(`Cannot create directory: ${pathArray.slice(0, index + 1).join("/")}`)
        }

        const newFolderUrlObj = new URL(parentNode.links.new_folder)
        newFolderUrlObj.searchParams.set("name", pathName)
        const createDirResponse = await fetchWithRetry(newFolderUrlObj.toString(), {
          method: "PUT",
          headers: {
            Authorization: `Bearer ${token}`,
            "Content-Type": "application/json",
          },
        })
        if (!createDirResponse.ok) {
          throw new Error(`Failed to create directory: ${pathArray.slice(0, index + 1).join("/")}`)
        }

        // Get the newly created directory node
        currentNodeList = await getFiles(token, currentUrl, true)
        parentNode = findFilesNodeFromDataList(currentNodeList.data, pathName)
        if (parentNode === null) {
          throw new Error(`Failed to find newly created directory: ${pathArray.slice(0, index + 1).join("/")}`)
        }
        currentUrl = parentNode.relationships.files?.links.related.href ?? ""
        if (currentUrl === "") {
          throw new Error(`No files relationship found for node: ${pathArray.slice(0, index + 1).join("/")}`)
        }
        currentNodeList = await getFiles(token, currentUrl, true)
      }
    }

    if (parentNode === null) {
      throw new Error(`Failed to find parent directory: ${pathArray.join("/")}`)
    }
    const fileNode = findFilesNodeFromDataList(currentNodeList.data, fileName)
    if (fileNode !== null && update === false) {
      throw new Error(`File already exists and update is disabled: ${path}`)
    }

    const uploadUrl = fileNode?.links.upload ?? parentNode.links.upload
    if (uploadUrl === undefined) {
      throw new Error(`No upload link found for file: ${path}`)
    }

    const uploadUrlObj = new URL(uploadUrl)
    if (fileNode === null) {
      // Upload a new file
      uploadUrlObj.searchParams.set("name", fileName)
    }
    const uploadResponse = await fetchWithRetry(uploadUrlObj.toString(), {
      method: "PUT",
      headers: {
        Authorization: `Bearer ${token}`,
        "Content-Type": "application/json",
      },
      body: content,
    })
    if (!uploadResponse.ok) {
      throw new Error(`Failed to upload file: ${path}`)
    }
  } catch (error) {
    throw new Error("Failed to write file", { cause: error })
  }
}

/**
 * Reads the DMP JSON file (`dmp-project.json`) from GRDM and returns a validated `Dmp` object.
 *
 * DMP-specific responsibilities not present in the new package:
 *   - Locates the canonical file by `DMP_FILE_NAME` via `findFilesNode`
 *   - Applies backward-compatibility migrations to older DMP formats:
 *       - Initialises missing `linkedGrdmFiles` arrays
 *       - Renames `linkedGrdmProjectIds` (array of strings) to `linkedGrdmProjects`
 *         (array of `{ projectId }` objects)
 *   - Validates the result with `dmpSchema` (Zod)
 */
export const readDmpFile = async (token: string, projectId: string): Promise<{
  dmp: Dmp
  node: FilesNode
}> => {
  try {
    const { content, node } = await readFile(token, projectId, DMP_FILE_NAME)

    // for 後方互換性
    const dmpObj = JSON.parse(content)
    for (const dataInfo of dmpObj.dataInfo) {
      if (dataInfo.linkedGrdmFiles === undefined) {
        dataInfo.linkedGrdmFiles = []
      }
    }
    if (dmpObj.linkedGrdmProjectIds) {
      const ids = dmpObj.linkedGrdmProjectIds
      dmpObj.linkedGrdmProjects = ids.map((id: string) => ({
        projectId: id,
      }))
      delete dmpObj.linkedGrdmProjectIds
    }
    if (!dmpObj.linkedGrdmProjects) {
      dmpObj.linkedGrdmProjects = []
    }

    return {
      dmp: dmpSchema.parse(dmpObj),
      node,
    }
  } catch (error) {
    throw new Error("Failed to read DMP file", { cause: error })
  }
}

/**
 * Serialises a `Dmp` object to JSON and writes it to GRDM as `dmp-project.json`.
 *
 * Delegates to `writeFile`, which handles directory auto-creation and upload URL resolution —
 * custom logic that has no equivalent in `@hirakinii-packages/grdm-api-typescript`.
 */
export const writeDmpFile = async (token: string, projectId: string, dmp: Dmp): Promise<void> => {
  try {
    await writeFile(token, projectId, DMP_FILE_NAME, JSON.stringify(dmp, null, 2))
  } catch (error) {
    throw new Error("Failed to write DMP file", { cause: error })
  }
}

export const createProject = async (token: string, projectName: string): Promise<ProjectInfo> => {
  try {
    const client = createGrdmClient(token)
    const node = await client.nodes.create({ title: projectName, category: "project" })
    return nodeToProjectInfo(transformedToNodeData(node))
  } catch (error) {
    throw new Error("Failed to create project", { cause: error })
  }
}

export const listingFileNodes = async (token: string, projectId: string, folderNodeId: string | null, followPagination = false): Promise<GetFilesResponse> => {
  if (folderNodeId) {
    const url = `${GRDM_API_BASE_URL}/nodes/${projectId}/files/osfstorage/${folderNodeId}/`
    return getFiles(token, url, followPagination)
  } else {
    const url = `${GRDM_API_BASE_URL}/nodes/${projectId}/files/osfstorage/`
    return getFiles(token, url, followPagination)
  }
}
