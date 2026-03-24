import { LinkedGrdmFile } from "@/dmp"
import { listingFileNodes } from "@/grdmClient"

// ============================================================
// Types
// ============================================================

export type TreeNodeType = "file" | "folder" | "project" | "loading" | "error"

export interface TreeNode {
  projectId: string
  nodeId: string
  label: string
  children: TreeNode[]
  type: TreeNodeType
  size?: number | null
  materialized_path?: string | null
  last_touched?: string | null
  date_modified?: string | null
  date_created?: string | null
  hash_md5?: string | null
  hash_sha256?: string | null
  link?: string | null
}

export type FileTree = TreeNode[]

// ============================================================
// Tree utilities
// ============================================================

export const updateNodeInTree = (
  tree: TreeNode[],
  activeNode: TreeNode,
  updates: Partial<TreeNode>,
): TreeNode[] => {
  return tree.map((node) => {
    if (node.nodeId === activeNode.nodeId) {
      return { ...node, ...updates }
    }
    if (node.children) {
      return {
        ...node,
        children: updateNodeInTree(node.children, activeNode, updates),
      }
    }
    return node
  })
}

export const findNodeInTree = (
  tree: TreeNode[],
  nodeId: string,
): TreeNode | null => {
  for (const node of tree) {
    if (node.nodeId === nodeId) return node
    const child = findNodeInTree(node.children, nodeId)
    if (child) return child
  }
  return null
}

export const findParentNodeInTree = (
  tree: TreeNode[],
  nodeId: string,
): TreeNode | null => {
  for (const node of tree) {
    if (node.children.some((child) => child.nodeId === nodeId)) return node
    const child = findParentNodeInTree(node.children, nodeId)
    if (child) return child
  }
  return null
}

export const createLoadingNode = (projectId: string): TreeNode => ({
  projectId,
  nodeId: `loading-${crypto.randomUUID()}`,
  label: "Loading...",
  children: [],
  type: "loading",
})

export const createErrorNode = (projectId: string, label = "Load error"): TreeNode => ({
  projectId,
  nodeId: `error-${crypto.randomUUID()}`,
  label,
  children: [],
  type: "error",
})

export const isAlreadyFetched = (node: TreeNode): boolean => {
  return !(node.children.length === 1 && (node.children[0].type === "loading" || node.children[0].type === "error"))
}

const basename = (path: string | undefined): string | undefined => {
  if (!path) return undefined
  const trimmed = path.replace(/^\//, "").replace(/\/$/, "")
  const parts = trimmed.split("/")
  return parts.length > 0 ? parts[parts.length - 1] : ""
}

const downloadToLink = (download: string | undefined): string | null => {
  if (!download) return null
  const match = download.match(/\/download\/([^/]+)\/?$/)
  if (!match) return null
  const id = match[1]
  return id.length === 5 ? download.replace("/download", "") : null
}

export const fetchFileNodes = async (
  token: string,
  node: TreeNode,
): Promise<TreeNode[]> => {
  if (node.type === "loading" || node.type === "error" || node.type === "file") {
    return []
  }
  const folderNodeId = node.type === "folder" ? node.nodeId : null
  const res = await listingFileNodes(token, node.projectId, folderNodeId)

  return res.data.map((resData) => ({
    projectId: node.projectId,
    nodeId: resData.id,
    label: basename(resData.attributes.materialized_path) ?? resData.id,
    children: resData.attributes.kind === "folder" ? [createLoadingNode(node.projectId)] : [],
    type: resData.attributes.kind as TreeNodeType,
    size: resData.attributes.size,
    materialized_path: resData.attributes.materialized_path,
    last_touched: resData.attributes.last_touched,
    date_modified: resData.attributes.date_modified,
    date_created: resData.attributes.date_created,
    hash_md5: resData.attributes?.extra?.hashes?.md5,
    hash_sha256: resData.attributes?.extra?.hashes?.sha256,
    link: downloadToLink(resData?.links?.download),
  }))
}

export const nodeToLinkedFile = (node: TreeNode): LinkedGrdmFile => {
  return {
    projectId: node.projectId,
    nodeId: node.nodeId,
    label: node.label,
    size: node.size ?? null,
    materialized_path: node.materialized_path ?? null,
    last_touched: node.last_touched ?? null,
    date_modified: node.date_modified ?? null,
    date_created: node.date_created ?? null,
    hash_md5: node.hash_md5 ?? null,
    hash_sha256: node.hash_sha256 ?? null,
    type: "file",
  }
}

export const allTreeNode = (tree: FileTree): TreeNode[] => {
  return tree.flatMap((node) => {
    if (node.type === "file" || node.type === "loading" || node.type === "error") {
      return [node]
    }
    return [node, ...allTreeNode(node.children)]
  })
}

