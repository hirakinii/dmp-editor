import AddLinkOutlined from "@mui/icons-material/AddLinkOutlined"
import LinkOffOutlined from "@mui/icons-material/LinkOffOutlined"
import { Box, Button, Chip, CircularProgress, Dialog, DialogActions, DialogContent, DialogTitle, Typography } from "@mui/material"
import { useState } from "react"
import { useTranslation } from "react-i18next"

import { allTreeNode, nodeToLinkedFile, TreeNode } from "@/components/EditProject/grdmFileTreeUtils"
import GrdmFileTreeView from "@/components/EditProject/GrdmFileTreeView"
import { LinkedGrdmFile } from "@/dmp"
import { ProjectInfo } from "@/grdmClient"

// ============================================================
// GrdmSelectModal
// ============================================================

export interface GrdmSelectModalProps {
  open: boolean
  onClose: () => void
  projects: ProjectInfo[]
  linkedProjectIds: string[]
  linkedFiles: LinkedGrdmFile[]
  onLinkedFilesChange: (files: LinkedGrdmFile[]) => void
}

export default function GrdmSelectModal({
  open,
  onClose,
  projects,
  linkedProjectIds,
  linkedFiles,
  onLinkedFilesChange,
}: GrdmSelectModalProps) {
  const { t } = useTranslation("editProject")

  // Track per-folder linking state (folder nodeId → loading)
  const [linkingFolderIds, setLinkingFolderIds] = useState<Set<string>>(new Set())

  const handleLinkFile = (node: TreeNode) => {
    if (node.type !== "file") return
    const existingIds = linkedFiles.map((f) => f.nodeId)
    if (existingIds.includes(node.nodeId)) return
    onLinkedFilesChange([...linkedFiles, nodeToLinkedFile(node)])
  }

  const handleUnlinkFile = (nodeId: string) => {
    onLinkedFilesChange(linkedFiles.filter((f) => f.nodeId !== nodeId))
  }

  const handleLinkFolder = async (
    node: TreeNode,
    fetchAllChildren: (n: TreeNode) => Promise<TreeNode | null>,
  ) => {
    setLinkingFolderIds((prev) => new Set(prev).add(node.nodeId))
    const updatedNode = await fetchAllChildren(node)
    setLinkingFolderIds((prev) => {
      const next = new Set(prev)
      next.delete(node.nodeId)
      return next
    })
    if (!updatedNode) return

    const existingIds = linkedFiles.map((f) => f.nodeId)
    const newFiles = allTreeNode([updatedNode])
      .filter((n) => n.type === "file")
      .map(nodeToLinkedFile)
      .filter((f) => !existingIds.includes(f.nodeId))
    onLinkedFilesChange([...linkedFiles, ...newFiles])
  }

  const handleUnlinkFolder = (node: TreeNode) => {
    const removeIds = allTreeNode([node]).map((n) => n.nodeId)
    onLinkedFilesChange(linkedFiles.filter((f) => !removeIds.includes(f.nodeId)))
  }

  const renderNodeActions = (
    node: TreeNode,
    _loadingNodeIds: Set<string>,
    fetchAllChildren: (n: TreeNode) => Promise<TreeNode | null>,
  ) => {
    if (node.type === "file") {
      const isLinked = linkedFiles.some((f) => f.nodeId === node.nodeId)
      return (
        <Button
          variant="outlined"
          color={isLinked ? "warning" : "primary"}
          size="small"
          onClick={() => isLinked ? handleUnlinkFile(node.nodeId) : handleLinkFile(node)}
          startIcon={isLinked ? <LinkOffOutlined /> : <AddLinkOutlined />}
          sx={{ width: "130px" }}
        >
          {isLinked ? t("fileTree.unlink") : t("fileTree.link")}
        </Button>
      )
    }

    // folder
    const isLoadingFolder = linkingFolderIds.has(node.nodeId)
    return (
      <>
        <Button
          variant="outlined"
          color="primary"
          size="small"
          onClick={() => handleLinkFolder(node, fetchAllChildren)}
          startIcon={isLoadingFolder ? <CircularProgress size={14} /> : <AddLinkOutlined />}
          sx={{ width: "130px" }}
          disabled={isLoadingFolder}
        >
          {isLoadingFolder ? t("fileTree.selectDataDialog.linking") : t("fileTree.selectDataDialog.linkButton")}
        </Button>
        <Button
          variant="outlined"
          color="warning"
          size="small"
          onClick={() => handleUnlinkFolder(node)}
          startIcon={<LinkOffOutlined />}
          sx={{ width: "130px" }}
        >
          {t("fileTree.unlink")}
        </Button>
        <Box sx={{ width: "0" }} />
      </>
    )
  }

  // Compute linked file count for display in the title
  const linkedFileCount = linkedFiles.length

  return (
    <Dialog
      open={open}
      onClose={onClose}
      fullWidth
      maxWidth="lg"
      closeAfterTransition={false}
    >
      <DialogTitle sx={{ mt: "0.5rem", mx: "1rem", display: "flex", alignItems: "center", gap: "1rem" }}>
        {t("dataInfo.editForm.selectGrdmData")}
        <Chip
          label={t("dataInfo.grdmSelectModal.linkedCount", { count: linkedFileCount })}
          size="small"
          color="primary"
          variant="outlined"
        />
      </DialogTitle>
      <DialogContent sx={{ mx: "1rem" }}>
        <Typography variant="body2" sx={{ mb: "1rem", color: "text.secondary" }}>
          {t("dataInfo.grdmSelectModal.description")}
        </Typography>
        <GrdmFileTreeView
          projects={projects}
          linkedProjectIds={linkedProjectIds}
          renderNodeActions={renderNodeActions}
        />
      </DialogContent>
      <DialogActions sx={{ m: "0.5rem 1.5rem 1.5rem" }}>
        <Button variant="outlined" color="secondary" onClick={onClose}>
          {t("dataInfo.grdmSelectModal.close")}
        </Button>
      </DialogActions>
    </Dialog>
  )
}
