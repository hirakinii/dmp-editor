import AddLinkOutlined from "@mui/icons-material/AddLinkOutlined"
import ErrorOutline from "@mui/icons-material/ErrorOutline"
import ExpandMoreIcon from "@mui/icons-material/ExpandMore"
import FolderOutlined from "@mui/icons-material/FolderOutlined"
import FolderSpecialOutlined from "@mui/icons-material/FolderSpecialOutlined"
import InsertDriveFileOutlined from "@mui/icons-material/InsertDriveFileOutlined"
import LinkOffOutlined from "@mui/icons-material/LinkOffOutlined"
import OpenInNew from "@mui/icons-material/OpenInNew"
import { Box, Typography, CircularProgress, Button, Dialog, DialogTitle, DialogContent, TableContainer, Paper, Table, TableHead, TableRow, TableCell, TableBody, Chip, Link, DialogActions, Accordion, AccordionSummary, AccordionDetails } from "@mui/material"
import { SxProps } from "@mui/system"
import { TreeItem, SimpleTreeView } from "@mui/x-tree-view"
import React, { useCallback, useEffect, useMemo, useState } from "react"
import { useFieldArray, useFormContext, useWatch } from "react-hook-form"
import { useTranslation } from "react-i18next"
import { useRecoilValue } from "recoil"

import SectionHeader from "@/components/EditProject/SectionHeader"
import { DmpFormValues, LinkedGrdmFile, LinkedGrdmProject } from "@/dmp"
import { listingFileNodes, ProjectInfo } from "@/grdmClient"
import { tokenAtom } from "@/store/token"
import { theme } from "@/theme"

interface FileTreeSectionProps {
  sx?: SxProps
  projects: ProjectInfo[]
}

type TreeNodeType = "file" | "folder" | "project" | "loading" | "error"
interface TreeNode {
  projectId: string
  nodeId: string
  label: string
  children: TreeNode[]
  type: TreeNodeType

  // metadata
  size?: number | null
  materialized_path?: string | null
  last_touched?: string | null
  date_modified?: string | null
  date_created?: string | null
  hash_md5?: string | null
  hash_sha256?: string | null
  link?: string | null
}
type FileTree = TreeNode[]

const updateNodeInTree = (
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

const findNodeInTree = (
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

const findParentNodeInTree = (
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

const createLoadingNode = (projectId: string): TreeNode => ({
  projectId,
  nodeId: `loading-${crypto.randomUUID()}`,
  label: "Loading...",
  children: [],
  type: "loading",
})

const createErrorNode = (projectId: string, label = "Load error"): TreeNode => ({
  projectId,
  nodeId: `error-${crypto.randomUUID()}`,
  label,
  children: [],
  type: "error",
})

const prefixIcons = {
  project: <FolderSpecialOutlined fontSize="small" sx={{ color: theme.palette.grey[700] }} />,
  folder: <FolderOutlined fontSize="small" sx={{ color: theme.palette.grey[700] }} />,
  file: <InsertDriveFileOutlined fontSize="small" sx={{ color: theme.palette.grey[700] }} />,
  loading: <CircularProgress size={16} sx={{ color: theme.palette.grey[700] }} />,
  error: <ErrorOutline fontSize="small" sx={{ color: theme.palette.error.main }} />,
}

const basename = (path: string | undefined): string | undefined => {
  if (!path) return undefined
  const trimmed = path.replace(/^\//, "").replace(/\/$/, "")
  const parts = trimmed.split("/")
  return parts.length > 0 ? parts[parts.length - 1] : ""
}

const isAlreadyFetched = (node: TreeNode): boolean => {
  return !(node.children.length === 1 && (node.children[0].type === "loading" || node.children[0].type === "error"))
}

const downloadToLink = (download: string | undefined): string | null => {
  if (!download) return null

  const match = download.match(/\/download\/([^/]+)\/?$/)
  if (!match) return null

  const id = match[1]
  return id.length === 5 ? download.replace("/download", "") : null
}

const fetchFileNodes = async (
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

const nodeToLinkedFile = (node: TreeNode): LinkedGrdmFile => {
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
    type: "file", // TODO: Handle folder case if needed
  }
}

const allTreeNode = (tree: FileTree): TreeNode[] => {
  return tree.flatMap((node) => {
    if (node.type === "file" || node.type === "loading" || node.type === "error") {
      return [node]
    }
    return [node, ...allTreeNode(node.children)]
  })
}

export default function FileTreeSection({ sx, projects }: FileTreeSectionProps) {
  const { t } = useTranslation("editProject")
  const token = useRecoilValue(tokenAtom)
  const linkedProjects = useWatch<DmpFormValues>({
    name: "dmp.linkedGrdmProjects",
    defaultValue: [],
  }) as LinkedGrdmProject[]
  const linkedProjectIds = useMemo(() => linkedProjects.map((p) => p.projectId), [linkedProjects])

  const [tree, setTree] = useState<FileTree>([])
  // Per-project expanded state for tree items within each accordion
  const [expandedMap, setExpandedMap] = useState<Record<string, string[]>>({})
  const [loadingNodeIds, setLoadingNodeIds] = useState<Set<string>>(new Set())

  // Dialog
  const [openNodeId, setOpenNodeId] = useState<string | null>(null)
  const handleDialogClose = () => setOpenNodeId(null)
  const { control } = useFormContext<DmpFormValues>()
  const { update } = useFieldArray<DmpFormValues, "dmp.dataInfo">({
    control,
    name: "dmp.dataInfo",
  })
  const dataInfos = useWatch<DmpFormValues>({
    name: "dmp.dataInfo",
    defaultValue: [],
  }) as DmpFormValues["dmp"]["dataInfo"]

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
  const firstProjectId = tree.length > 0 ? tree[0].nodeId : null
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

  const fetchAllChildren = async (node: TreeNode): Promise<TreeNode | null> => {
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
  }

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
    const linkedDataInfoNum = dataInfos.filter((f) => f.linkedGrdmFiles.some((lf) => lf.nodeId === node.nodeId)).length

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
                    "&:hover": {
                      textDecoration: "underline",
                    },
                    fontFamily: node.type === "file" || node.type === "folder" ? "monospace" : "inherit",
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
                      sx={{
                        p: "4px",
                        height: "24px",
                        ml: "0.5rem",
                      }}
                    >
                      {t("fileTree.retry")}
                    </Button>
                  )}
                </>
              )}
            </Box>
            {(node.type === "file" || node.type === "folder") && (
              <Box sx={{
                display: "flex",
                alignItems: "center",
                gap: "1rem",
                mr: node.type !== "file" ? "5.05rem" : "0",
              }}>
                <Button
                  variant="outlined"
                  color="primary"
                  onClick={(e) => {
                    e.stopPropagation()
                    setOpenNodeId(node.nodeId)
                  }}
                  sx={{
                    p: "4px",
                    height: "24px",
                    width: "8rem",
                  }}
                >
                  <AddLinkOutlined fontSize="inherit" sx={{ mr: "0.5rem" }} />
                  {t("fileTree.link")}
                </Button>
                {node.type === "file" && (
                  <Chip
                    label={`Linked: ${linkedDataInfoNum}`}
                    size="small"
                    sx={{ height: "20px", fontSize: "0.75rem" }}
                  />
                )}
              </Box>
            )}
          </Box>
        }
      >
        {node.children.map((child) => renderTree(child))}
      </TreeItem>
    )
  }, [dataInfos, setOpenNodeId, retryFetch, t])

  const renderDialogContent = () => {
    if (openNodeId === null) return null
    const node = findNodeInTree(tree, openNodeId)
    if (!node) return null

    const handleLinkFolderDataInfo = async (dataInfoIndex: number) => {
      const updatedNode = await fetchAllChildren(node)
      if (!updatedNode) return

      const dataInfo = dataInfos[dataInfoIndex]
      const existingNodeIds = dataInfo.linkedGrdmFiles.map((f) => f.nodeId)
      const newFiles = allTreeNode([updatedNode])
        .filter((n) => n.type === "file")
        .map(nodeToLinkedFile)
        .filter((f) => !existingNodeIds.includes(f.nodeId))
      dataInfo.linkedGrdmFiles.push(...newFiles)
      update(dataInfoIndex, dataInfo)
    }
    const handleUnlinkFolderDataInfo = (dataInfoIndex: number) => {
      const removeNodeIds = allTreeNode([node]).map((n) => n.nodeId)
      const dataInfo = dataInfos[dataInfoIndex]
      dataInfo.linkedGrdmFiles = dataInfo.linkedGrdmFiles.filter((f) => !removeNodeIds.includes(f.nodeId))
      update(dataInfoIndex, dataInfo)
    }

    const handleLinkFileDataInfo = (dataInfoIndex: number) => {
      if (node.type !== "file") return
      const dataInfo = dataInfos[dataInfoIndex]
      const existingNodeIds = dataInfo.linkedGrdmFiles.map((f) => f.nodeId)
      const newFile = nodeToLinkedFile(node)
      if (!existingNodeIds.includes(newFile.nodeId)) {
        dataInfo.linkedGrdmFiles.push(newFile)
        update(dataInfoIndex, dataInfo)
      }
    }

    const handleUnlinkFileDataInfo = (dataInfoIndex: number) => {
      const dataInfo = dataInfos[dataInfoIndex]
      dataInfo.linkedGrdmFiles = dataInfo.linkedGrdmFiles.filter((f) => f.nodeId !== node.nodeId)
      update(dataInfoIndex, dataInfo)
    }

    const renderFolderButtons = (dataInfoIndex: number) => {
      const loading = loadingNodeIds.has(node.nodeId)
      return (
        <>
          <Button
            variant="outlined"
            color="primary"
            size="small"
            onClick={() => handleLinkFolderDataInfo(dataInfoIndex)}
            startIcon={<AddLinkOutlined />}
            sx={{ width: "130px" }}
            disabled={loading}
          >
            {loading ? t("fileTree.selectDataDialog.linking") : t("fileTree.selectDataDialog.linkButton")}
          </Button>
          <Button
            variant="outlined"
            color="warning"
            size="small"
            onClick={() => handleUnlinkFolderDataInfo(dataInfoIndex)}
            startIcon={<LinkOffOutlined />}
            sx={{ width: "130px" }}
          >
            {t("fileTree.unlink")}
          </Button>
        </>
      )
    }

    const renderFileButtons = (dataInfoIndex: number) => {
      const found = dataInfos[dataInfoIndex].linkedGrdmFiles.some((f) => f.nodeId === node.nodeId)
      return (
        <Button
          variant="outlined"
          color={found ? "warning" : "primary"}
          size="small"
          onClick={() => {
            if (found) {
              handleUnlinkFileDataInfo(dataInfoIndex)
            } else {
              handleLinkFileDataInfo(dataInfoIndex)
            }
          }}
          startIcon={found ? <LinkOffOutlined /> : <AddLinkOutlined />}
          sx={{ width: "130px" }}
        >
          {found ? t("fileTree.unlink") : t("fileTree.link")}
        </Button>
      )
    }

    return (
      <Box sx={{ display: "flex", flexDirection: "column", gap: "1rem" }}>
        <Typography>
          <Typography component="span" sx={{ fontFamily: "monospace" }}>
            {node.materialized_path ?? node.label}
          </Typography>
          {t("fileTree.selectDataDialog.descriptionSuffix")}
        </Typography>
        {node.type === "folder" && (
          <Typography>
            {t("fileTree.folderHelp")}
          </Typography>
        )}

        <TableContainer component={Paper} variant="outlined" sx={{
          borderBottom: "none",
          mt: "0.5rem",
          width: "100%",
        }}>
          <Table>
            <TableHead sx={{ backgroundColor: theme.palette.grey[100] }}>
              <TableRow>
                {[t("fileTree.colName"), t("fileTree.colField"), t("fileTree.colType"), ""].map((header, index) => (
                  <TableCell
                    key={index}
                    children={header}
                    sx={{ fontWeight: "bold", textAlign: "left", p: "0.5rem 1rem" }}
                  />
                ))}
              </TableRow>
            </TableHead>
            <TableBody>
              {dataInfos.map((dataInfo, index) => {
                return (
                  <TableRow key={index}>
                    <TableCell children={dataInfo.dataName} sx={{ p: "0.5rem 1rem" }} />
                    <TableCell children={dataInfo.researchField} sx={{ p: "0.5rem 1rem" }} />
                    <TableCell children={dataInfo.dataType} sx={{ p: "0.5rem 1rem" }} />
                    <TableCell sx={{ display: "flex", justifyContent: "end", p: "0.5rem 1rem", gap: "1rem" }}>
                      {node.type === "folder" ? (
                        renderFolderButtons(index)
                      ) : (
                        renderFileButtons(index)
                      )}
                    </TableCell>
                  </TableRow>
                )
              })}
            </TableBody>
          </Table>
        </TableContainer>
      </Box>
    )
  }

  return (
    <Box sx={{ ...sx, display: "flex", flexDirection: "column" }}>
      <SectionHeader text={t("fileTree.sectionTitle")} />
      <Typography sx={{ mt: "0.5rem" }}>
        {t("fileTree.description")}
      </Typography>

      {tree.length === 0 ? (
        <Box sx={{ p: "0.5rem", mt: "1rem", border: `1px solid ${theme.palette.divider}`, borderRadius: "4px" }}>
          <Typography sx={{ mx: "1rem", my: "0.5rem" }}>
            {t("fileTree.noLinkedProjects")}
          </Typography>
        </Box>
      ) : (
        <Box sx={{ mt: "1rem" }}>
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
                    //do nothing
                  }}
                  itemChildrenIndentation={24}
                >
                  {projectNode.children.map((child) => renderTree(child))}
                </SimpleTreeView>
              </AccordionDetails>
            </Accordion>
          ))}
        </Box>
      )}

      <Dialog
        open={openNodeId !== null}
        onClose={handleDialogClose}
        fullWidth
        maxWidth="md"
        closeAfterTransition={false}
      >
        <DialogTitle sx={{ mt: "0.5rem", mx: "1rem" }}>
          {t("fileTree.selectDataDialog.title")}
        </DialogTitle>
        <DialogContent sx={{ display: "flex", flexDirection: "column", gap: "1rem", mt: "0.5rem", mx: "1rem" }}>
          {renderDialogContent()}
        </DialogContent>
        <DialogActions sx={{ m: "0.5rem 1.5rem 1.5rem" }}>
          <Button
            variant="outlined"
            color="secondary"
            onClick={handleDialogClose}
          >
            {t("fileTree.selectDataDialog.cancel")}
          </Button>
        </DialogActions>
      </Dialog>
    </Box>
  )
}
