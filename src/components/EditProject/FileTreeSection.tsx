import AddLinkOutlined from "@mui/icons-material/AddLinkOutlined"
import LinkOffOutlined from "@mui/icons-material/LinkOffOutlined"
import { Box, Typography, Button, Dialog, DialogTitle, DialogContent, TableContainer, Paper, Table, TableHead, TableRow, TableCell, TableBody, Chip, DialogActions } from "@mui/material"
import { SxProps } from "@mui/system"
import { useRef, useState } from "react"
import { useFieldArray, useFormContext, useWatch } from "react-hook-form"
import { useTranslation } from "react-i18next"

import { allTreeNode, nodeToLinkedFile, TreeNode } from "@/components/EditProject/grdmFileTreeUtils"
import GrdmFileTreeView from "@/components/EditProject/GrdmFileTreeView"
import SectionHeader from "@/components/EditProject/SectionHeader"
import { DmpFormValues, LinkedGrdmFile, LinkedGrdmProject } from "@/dmp"
import { ProjectInfo } from "@/grdmClient"
import { theme } from "@/theme"

interface FileTreeSectionProps {
  sx?: SxProps
  projects: ProjectInfo[]
}

export default function FileTreeSection({ sx, projects }: FileTreeSectionProps) {
  const { t } = useTranslation("editProject")
  const linkedProjects = useWatch<DmpFormValues>({
    name: "dmp.linkedGrdmProjects",
    defaultValue: [],
  }) as LinkedGrdmProject[]
  const linkedProjectIds = linkedProjects.map((p) => p.projectId)

  const { control } = useFormContext<DmpFormValues>()
  const { update } = useFieldArray<DmpFormValues, "dmp.dataInfo">({
    control,
    name: "dmp.dataInfo",
  })
  const dataInfos = useWatch<DmpFormValues>({
    name: "dmp.dataInfo",
    defaultValue: [],
  }) as DmpFormValues["dmp"]["dataInfo"]

  // Dialog state: which node was selected in the tree
  const [dialogNode, setDialogNode] = useState<TreeNode | null>(null)
  // Ref holding the latest fetchAllChildren from GrdmFileTreeView
  const fetchAllChildrenRef = useRef<((n: TreeNode) => Promise<TreeNode | null>) | null>(null)
  // Ref holding the latest loadingNodeIds from GrdmFileTreeView
  const loadingNodeIdsRef = useRef<Set<string>>(new Set())
  // Local linking-in-progress state for the dialog folder button
  const [isLinking, setIsLinking] = useState(false)

  const handleDialogClose = () => setDialogNode(null)

  // ---- Link / Unlink handlers ----

  const handleLinkFolderDataInfo = async (node: TreeNode, dataInfoIndex: number) => {
    const fetchFn = fetchAllChildrenRef.current
    if (!fetchFn) return
    setIsLinking(true)
    const updatedNode = await fetchFn(node)
    setIsLinking(false)
    if (!updatedNode) return

    const dataInfo = dataInfos[dataInfoIndex]
    const existingNodeIds = dataInfo.linkedGrdmFiles.map((f: LinkedGrdmFile) => f.nodeId)
    const newFiles = allTreeNode([updatedNode])
      .filter((n) => n.type === "file")
      .map(nodeToLinkedFile)
      .filter((f) => !existingNodeIds.includes(f.nodeId))
    dataInfo.linkedGrdmFiles.push(...newFiles)
    update(dataInfoIndex, dataInfo)
  }

  const handleUnlinkFolderDataInfo = (node: TreeNode, dataInfoIndex: number) => {
    const removeNodeIds = allTreeNode([node]).map((n) => n.nodeId)
    const dataInfo = dataInfos[dataInfoIndex]
    dataInfo.linkedGrdmFiles = dataInfo.linkedGrdmFiles.filter((f: LinkedGrdmFile) => !removeNodeIds.includes(f.nodeId))
    update(dataInfoIndex, dataInfo)
  }

  const handleLinkFileDataInfo = (node: TreeNode, dataInfoIndex: number) => {
    if (node.type !== "file") return
    const dataInfo = dataInfos[dataInfoIndex]
    const existingNodeIds = dataInfo.linkedGrdmFiles.map((f: LinkedGrdmFile) => f.nodeId)
    const newFile = nodeToLinkedFile(node)
    if (!existingNodeIds.includes(newFile.nodeId)) {
      dataInfo.linkedGrdmFiles.push(newFile)
      update(dataInfoIndex, dataInfo)
    }
  }

  const handleUnlinkFileDataInfo = (node: TreeNode, dataInfoIndex: number) => {
    const dataInfo = dataInfos[dataInfoIndex]
    dataInfo.linkedGrdmFiles = dataInfo.linkedGrdmFiles.filter((f: LinkedGrdmFile) => f.nodeId !== node.nodeId)
    update(dataInfoIndex, dataInfo)
  }

  // ---- Dialog content ----

  const renderDialogContent = () => {
    if (!dialogNode) return null

    const renderFolderButtons = (dataInfoIndex: number) => (
      <>
        <Button
          variant="outlined"
          color="primary"
          size="small"
          onClick={() => handleLinkFolderDataInfo(dialogNode, dataInfoIndex)}
          startIcon={<AddLinkOutlined />}
          sx={{ width: "130px" }}
          disabled={isLinking}
        >
          {isLinking ? t("fileTree.selectDataDialog.linking") : t("fileTree.selectDataDialog.linkButton")}
        </Button>
        <Button
          variant="outlined"
          color="warning"
          size="small"
          onClick={() => handleUnlinkFolderDataInfo(dialogNode, dataInfoIndex)}
          startIcon={<LinkOffOutlined />}
          sx={{ width: "130px" }}
        >
          {t("fileTree.unlink")}
        </Button>
      </>
    )

    const renderFileButtons = (dataInfoIndex: number) => {
      const found = dataInfos[dataInfoIndex].linkedGrdmFiles.some((f: LinkedGrdmFile) => f.nodeId === dialogNode.nodeId)
      return (
        <Button
          variant="outlined"
          color={found ? "warning" : "primary"}
          size="small"
          onClick={() => {
            if (found) {
              handleUnlinkFileDataInfo(dialogNode, dataInfoIndex)
            } else {
              handleLinkFileDataInfo(dialogNode, dataInfoIndex)
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
            {dialogNode.materialized_path ?? dialogNode.label}
          </Typography>
          {t("fileTree.selectDataDialog.descriptionSuffix")}
        </Typography>
        {dialogNode.type === "folder" && (
          <Typography>
            {t("fileTree.folderHelp")}
          </Typography>
        )}

        <TableContainer component={Paper} variant="outlined" sx={{ borderBottom: "none", mt: "0.5rem", width: "100%" }}>
          <Table>
            <TableHead sx={{ backgroundColor: theme.palette.grey[100] }}>
              <TableRow>
                {[t("fileTree.colName"), t("fileTree.colField"), t("fileTree.colType"), ""].map((header, index) => (
                  <TableCell key={index} children={header} sx={{ fontWeight: "bold", textAlign: "left", p: "0.5rem 1rem" }} />
                ))}
              </TableRow>
            </TableHead>
            <TableBody>
              {dataInfos.map((dataInfo, index) => (
                <TableRow key={index}>
                  <TableCell children={dataInfo.dataName} sx={{ p: "0.5rem 1rem" }} />
                  <TableCell children={dataInfo.researchField} sx={{ p: "0.5rem 1rem" }} />
                  <TableCell children={dataInfo.dataType} sx={{ p: "0.5rem 1rem" }} />
                  <TableCell sx={{ display: "flex", justifyContent: "end", p: "0.5rem 1rem", gap: "1rem" }}>
                    {dialogNode.type === "folder" ? renderFolderButtons(index) : renderFileButtons(index)}
                  </TableCell>
                </TableRow>
              ))}
            </TableBody>
          </Table>
        </TableContainer>
      </Box>
    )
  }

  // ---- renderNodeActions passed to GrdmFileTreeView ----

  const renderNodeActions = (
    node: TreeNode,
    loadingNodeIds: Set<string>,
    fetchAllChildren: (n: TreeNode) => Promise<TreeNode | null>,
  ) => {
    // Keep refs updated so the dialog can use them
    fetchAllChildrenRef.current = fetchAllChildren
    loadingNodeIdsRef.current = loadingNodeIds

    const linkedDataInfoNum = dataInfos.filter(
      (f) => f.linkedGrdmFiles.some((lf: LinkedGrdmFile) => lf.nodeId === node.nodeId),
    ).length

    return (
      <>
        <Button
          variant="outlined"
          color="primary"
          onClick={(e) => {
            e.stopPropagation()
            fetchAllChildrenRef.current = fetchAllChildren
            loadingNodeIdsRef.current = loadingNodeIds
            setDialogNode(node)
          }}
          sx={{ p: "4px", height: "24px", width: "8rem" }}
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
        {node.type === "folder" && (
          <Box sx={{ width: "5.05rem" }} />
        )}
      </>
    )
  }

  return (
    <Box sx={{ ...sx, display: "flex", flexDirection: "column" }}>
      <SectionHeader text={t("fileTree.sectionTitle")} />
      <Typography sx={{ mt: "0.5rem" }}>
        {t("fileTree.description")}
      </Typography>

      <Box sx={{ mt: "1rem" }}>
        <GrdmFileTreeView
          projects={projects}
          linkedProjectIds={linkedProjectIds}
          renderNodeActions={renderNodeActions}
        />
      </Box>

      <Dialog
        open={dialogNode !== null}
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
          <Button variant="outlined" color="secondary" onClick={handleDialogClose}>
            {t("fileTree.selectDataDialog.cancel")}
          </Button>
        </DialogActions>
      </Dialog>
    </Box>
  )
}
