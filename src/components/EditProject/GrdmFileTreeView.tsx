import ErrorOutline from "@mui/icons-material/ErrorOutline"
import ExpandMoreIcon from "@mui/icons-material/ExpandMore"
import FolderOutlined from "@mui/icons-material/FolderOutlined"
import FolderSpecialOutlined from "@mui/icons-material/FolderSpecialOutlined"
import InsertDriveFileOutlined from "@mui/icons-material/InsertDriveFileOutlined"
import OpenInNew from "@mui/icons-material/OpenInNew"
import {
  Accordion,
  AccordionDetails,
  AccordionSummary,
  Box,
  Button,
  CircularProgress,
  Link,
  Typography,
} from "@mui/material"
import { TreeItem, SimpleTreeView } from "@mui/x-tree-view"
import React, { useCallback, useEffect, useMemo, useState } from "react"
import { useTranslation } from "react-i18next"
import { useRecoilValue } from "recoil"

import {
  createErrorNode,
  createLoadingNode,
  fetchFileNodes,
  FileTree,
  findNodeInTree,
  findParentNodeInTree,
  isAlreadyFetched,
  TreeNode,
  TreeNodeType,
  updateNodeInTree,
} from "@/components/EditProject/grdmFileTreeUtils"
import { ProjectInfo } from "@/grdmClient"
import { tokenAtom } from "@/store/token"
import { theme } from "@/theme"

// ============================================================
// Icons
// ============================================================

const prefixIcons: Record<TreeNodeType, React.ReactNode> = {
  project: <FolderSpecialOutlined fontSize="small" sx={{ color: theme.palette.grey[700] }} />,
  folder: <FolderOutlined fontSize="small" sx={{ color: theme.palette.grey[700] }} />,
  file: <InsertDriveFileOutlined fontSize="small" sx={{ color: theme.palette.grey[700] }} />,
  loading: <CircularProgress size={16} sx={{ color: theme.palette.grey[700] }} />,
  error: <ErrorOutline fontSize="small" sx={{ color: theme.palette.error.main }} />,
}

// ============================================================
// GrdmFileTreeView — shared file tree component
// ============================================================

export interface GrdmFileTreeViewProps {
  projects: ProjectInfo[]
  linkedProjectIds: string[]
  /**
   * Render action buttons for each file/folder node.
   * @param node - The tree node
   * @param loadingNodeIds - Set of node IDs currently being fetched
   * @param fetchAllChildren - Recursively fetches all child nodes of a folder
   */
  renderNodeActions: (
    node: TreeNode,
    loadingNodeIds: Set<string>,
    fetchAllChildren: (node: TreeNode) => Promise<TreeNode | null>,
  ) => React.ReactNode
}

export default function GrdmFileTreeView({ projects, linkedProjectIds, renderNodeActions }: GrdmFileTreeViewProps) {
  const { t } = useTranslation("editProject")
  const token = useRecoilValue(tokenAtom)

  const [tree, setTree] = useState<FileTree>([])
  const [expandedMap, setExpandedMap] = useState<Record<string, string[]>>({})
  const [loadingNodeIds, setLoadingNodeIds] = useState<Set<string>>(new Set())

  // Initialize tree with linked projects
  useEffect(() => {
    setTree((prevTree) => {
      return linkedProjectIds.map((projectId) => {
        const project = projects.find((p) => p.id === projectId)
        if (!project) return null
        const prevNode = findNodeInTree(prevTree, projectId)
        const children = prevNode?.children && prevNode.children.length > 0
          ? prevNode.children
          : [createLoadingNode(projectId)]
        return {
          projectId,
          nodeId: projectId,
          label: project.title,
          children,
          type: "project" as TreeNodeType,
        }
      }).filter((node) => node !== null)
    })
  }, [linkedProjectIds, projects])

  // Fetch root files for the first (default-expanded) project when it initializes
  const firstProjectId = useMemo(() => tree.length > 0 ? tree[0].nodeId : null, [tree])
  useEffect(() => {
    if (!firstProjectId) return
    const firstNode = tree[0]
    if (!firstNode || isAlreadyFetched(firstNode) || loadingNodeIds.has(firstNode.nodeId)) return

    setLoadingNodeIds((prev) => new Set(prev).add(firstNode.nodeId))

    fetchFileNodes(token, firstNode)
      .then((fetchedNodes) => {
        setTree((prevTree) => updateNodeInTree(prevTree, firstNode, { children: fetchedNodes }))
      })
      .catch(() => {
        const errorNode = createErrorNode(firstNode.projectId, t("fileTree.loadError"))
        setTree((prevTree) => updateNodeInTree(prevTree, firstNode, { children: [errorNode] }))
      })
      .finally(() => {
        setLoadingNodeIds((prev) => {
          const newSet = new Set(prev)
          newSet.delete(firstNode.nodeId)
          return newSet
        })
      })
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [firstProjectId, token])

  // Handle accordion expansion for a project node (fetches root files on first expand)
  const handleAccordionChange = (projectNode: TreeNode) => (_: React.SyntheticEvent, isExpanded: boolean) => {
    if (!isExpanded) return
    const currentNode = findNodeInTree(tree, projectNode.nodeId)
    if (!currentNode) return
    if (isAlreadyFetched(currentNode) || loadingNodeIds.has(currentNode.nodeId)) return

    setLoadingNodeIds((prev) => new Set(prev).add(currentNode.nodeId))

    fetchFileNodes(token, currentNode)
      .then((fetchedNodes) => {
        setTree((prevTree) => updateNodeInTree(prevTree, currentNode, { children: fetchedNodes }))
      })
      .catch(() => {
        const errorNode = createErrorNode(currentNode.projectId, t("fileTree.loadError"))
        setTree((prevTree) => updateNodeInTree(prevTree, currentNode, { children: [errorNode] }))
      })
      .finally(() => {
        setLoadingNodeIds((prev) => {
          const newSet = new Set(prev)
          newSet.delete(currentNode.nodeId)
          return newSet
        })
      })
  }

  // Handle tree item expansion within a specific project's SimpleTreeView
  const handleTreeToggle = (projectId: string) => async (_event: React.SyntheticEvent | null, nodeIds: string[]) => {
    const prevExpanded = expandedMap[projectId] ?? []
    const newlyExpandedNodeId = nodeIds.find((id) => !prevExpanded.includes(id))
    setExpandedMap((prev) => ({ ...prev, [projectId]: nodeIds }))
    if (!newlyExpandedNodeId) return
    if (loadingNodeIds.has(newlyExpandedNodeId)) return

    const node = findNodeInTree(tree, newlyExpandedNodeId)
    if (node === null) return
    if (isAlreadyFetched(node)) return

    setLoadingNodeIds((prev) => new Set(prev).add(node.nodeId))

    fetchFileNodes(token, node)
      .then((fetchedNodes) => {
        setTree((prevTree) => updateNodeInTree(prevTree, node, { children: fetchedNodes }))
      })
      .catch(() => {
        const errorNode = createErrorNode(node.projectId, t("fileTree.loadError"))
        setTree((prevTree) => updateNodeInTree(prevTree, node, { children: [errorNode] }))
      })
      .finally(() => {
        setLoadingNodeIds((prev) => {
          const newSet = new Set(prev)
          newSet.delete(node.nodeId)
          return newSet
        })
      })
  }

  const fetchAllChildren = useCallback(async (node: TreeNode): Promise<TreeNode | null> => {
    if (node.type === "file" || node.type === "loading" || node.type === "error") return node
    if (isAlreadyFetched(node)) {
      await Promise.all(node.children.map(fetchAllChildren))
      return node
    }

    setLoadingNodeIds((prev) => new Set(prev).add(node.nodeId))

    try {
      const fetchedNodes = await fetchFileNodes(token, node)
      const updatedTree = updateNodeInTree(tree, node, { children: fetchedNodes })
      const updatedNode = findNodeInTree(updatedTree, node.nodeId)
      setTree(updatedTree)
      return updatedNode ?? null
    } catch {
      const errorNode = createErrorNode(node.projectId, t("fileTree.loadError"))
      const updatedTree = updateNodeInTree(tree, node, { children: [errorNode] })
      setTree(updatedTree)
      return null
    } finally {
      setLoadingNodeIds((prev) => {
        const newSet = new Set(prev)
        newSet.delete(node.nodeId)
        return newSet
      })
    }

  }, [token, tree, t])

  const retryFetch = useCallback((node: TreeNode) => {
    if (node.type !== "error") return
    const parentNode = findParentNodeInTree(tree, node.nodeId)
    if (!parentNode) return

    setLoadingNodeIds((prev) => new Set(prev).add(parentNode.nodeId))

    fetchFileNodes(token, parentNode)
      .then((fetchedNodes) => {
        setTree((prevTree) => updateNodeInTree(prevTree, parentNode, { children: fetchedNodes }))
      })
      .catch(() => {
        const errorNode = createErrorNode(parentNode.projectId, t("fileTree.loadError"))
        setTree((prevTree) => updateNodeInTree(prevTree, parentNode, { children: [errorNode] }))
      })
      .finally(() => {
        setLoadingNodeIds((prev) => {
          const newSet = new Set(prev)
          newSet.delete(parentNode.nodeId)
          return newSet
        })
      })
  }, [token, tree, t])

  const renderTree = useCallback((node: TreeNode): React.ReactNode => {
    const isError = node.type === "error"
    const icon = prefixIcons[node.type]

    return (
      <TreeItem
        key={node.nodeId}
        itemId={node.nodeId}
        label={
          <Box sx={{ display: "flex", alignItems: "center", justifyContent: "space-between" }}>
            <Box sx={{ display: "flex", alignItems: "center", gap: "0.5rem" }}>
              {icon}
              {node.type === "file" && node.link ? (
                <Link
                  href={node.link}
                  target="_blank"
                  rel="noopener noreferrer"
                  onClick={(e) => e.stopPropagation()}
                  sx={{
                    display: "inline-flex",
                    alignItems: "center",
                    gap: "0.5rem",
                    textDecoration: "none",
                    color: "text.primary",
                    fontSize: "0.875rem",
                    "&:hover": { textDecoration: "underline" },
                    fontFamily: "monospace",
                  }}
                >
                  {node.label}
                  <OpenInNew sx={{ fontSize: "1rem" }} />
                </Link>
              ) : (
                <>
                  <Typography
                    color={isError ? "error.main" : "text.primary"}
                    variant="body2"
                    sx={{
                      fontFamily: node.type === "file" || node.type === "folder" ? "monospace" : "inherit",
                    }}
                  >
                    {node.label}
                  </Typography>
                  {node.type === "error" && (
                    <Button
                      variant="outlined"
                      color="primary"
                      size="small"
                      onClick={(e) => {
                        e.stopPropagation()
                        retryFetch(node)
                      }}
                      sx={{ p: "4px", height: "24px", ml: "0.5rem" }}
                    >
                      {t("fileTree.retry")}
                    </Button>
                  )}
                </>
              )}
            </Box>
            {(node.type === "file" || node.type === "folder") && (
              <Box
                sx={{ display: "flex", alignItems: "center", gap: "1rem" }}
                onClick={(e) => e.stopPropagation()}
              >
                {renderNodeActions(node, loadingNodeIds, fetchAllChildren)}
              </Box>
            )}
          </Box>
        }
      >
        {node.children.map((child) => renderTree(child))}
      </TreeItem>
    )
  }, [loadingNodeIds, fetchAllChildren, renderNodeActions, retryFetch, t])

  if (tree.length === 0) {
    return (
      <Box sx={{ p: "0.5rem", border: `1px solid ${theme.palette.divider}`, borderRadius: "4px" }}>
        <Typography sx={{ mx: "1rem", my: "0.5rem" }}>
          {t("fileTree.noLinkedProjects")}
        </Typography>
      </Box>
    )
  }

  return (
    <Box>
      {tree.map((projectNode, idx) => (
        <Accordion
          key={projectNode.nodeId}
          defaultExpanded={idx === 0}
          onChange={handleAccordionChange(projectNode)}
          variant="outlined"
          disableGutters
        >
          <AccordionSummary expandIcon={<ExpandMoreIcon />}>
            <Box sx={{ display: "flex", alignItems: "center", gap: "0.5rem" }}>
              <FolderSpecialOutlined fontSize="small" sx={{ color: theme.palette.grey[700] }} />
              <Typography>{projectNode.label}</Typography>
            </Box>
          </AccordionSummary>
          <AccordionDetails sx={{ p: "0.5rem" }}>
            <SimpleTreeView
              expandedItems={expandedMap[projectNode.projectId] ?? []}
              onExpandedItemsChange={(e, nodeIds) => handleTreeToggle(projectNode.projectId)(e, nodeIds)}
              selectedItems={null}
              onItemClick={() => {
                // do nothing
              }}
              itemChildrenIndentation={24}
            >
              {projectNode.children.map((child) => renderTree(child))}
            </SimpleTreeView>
          </AccordionDetails>
        </Accordion>
      ))}
    </Box>
  )
}
