import AddLinkOutlined from "@mui/icons-material/AddLinkOutlined"
import LinkOffOutlined from "@mui/icons-material/LinkOffOutlined"
import OpenInNew from "@mui/icons-material/OpenInNew"
import Search from "@mui/icons-material/Search"
import { Box, Button, Link, Typography, TableContainer, Table, TableHead, TableRow, TableCell, TableBody, Paper, colors, Dialog, DialogTitle, DialogContent, DialogActions, CircularProgress, Collapse, TextField, InputAdornment } from "@mui/material"
import { SxProps } from "@mui/system"
import { useState, useRef, useEffect } from "react"
import { useFieldArray, useFormContext, useWatch } from "react-hook-form"

import SectionHeader from "@/components/EditProject/SectionHeader"
import { DmpFormValues } from "@/dmp"
import { DMP_PROJECT_PREFIX, ProjectInfo, formatDateToTimezone } from "@/grdmClient"
import { useGrdmProjectMetadata } from "@/hooks/useGrdmProjectMetadata"
import { User } from "@/hooks/useUser"

interface ProjectTableProps {
  sx?: SxProps
  user: User
  projects: ProjectInfo[]
}

interface ProjectRowProps {
  project: ProjectInfo
  user: User
  isLinked: boolean
  onLink: (projectId: string) => void
  onUnlinkRequest: (projectId: string) => void
}

/**
 * Renders a single project row plus an optional metadata sub-row for linked projects.
 * Separating this into a sub-component allows useGrdmProjectMetadata to be called
 * per-project without violating the rules of hooks.
 */
function ProjectRow({ project, user, isLinked, onLink, onUnlinkRequest }: ProjectRowProps) {
  const { data: metaList, isLoading: isMetaLoading, isError: isMetaError } = useGrdmProjectMetadata(
    isLinked ? project.id : null,
  )

  // Take the first registration's grdmMeta if available
  const grdmMeta = metaList?.data[0]?.grdmMeta

  return (
    <>
      <TableRow key={project.id}>
        <TableCell sx={{ textAlign: "left", p: "0.5rem 1rem", width: "40%" }}>
          <Link
            href={project.html}
            target="_blank"
            rel="noopener noreferrer"
            sx={{ display: "inline-flex", alignItems: "center", gap: "0.5rem", textDecoration: "none" }}
          >
            {project.title}
            <OpenInNew sx={{ fontSize: "1rem" }} />
          </Link>
        </TableCell>
        <TableCell sx={{ textAlign: "center", p: "0.5rem 1rem", width: "20%" }}>
          {formatDateToTimezone(project.dateCreated, user.timezone)}
        </TableCell>
        <TableCell sx={{ textAlign: "center", p: "0.5rem 1rem", width: "20%" }}>
          {formatDateToTimezone(project.dateModified, user.timezone)}
        </TableCell>
        <TableCell sx={{ textAlign: "center", p: "0.5rem 1rem", width: "20%" }}>
          <Button
            variant="outlined"
            color={isLinked ? "warning" : "primary"}
            size="small"
            onClick={isLinked ? () => onUnlinkRequest(project.id) : () => onLink(project.id)}
            startIcon={isLinked ? <LinkOffOutlined /> : <AddLinkOutlined />}
            sx={{ width: "130px" }}
          >
            {isLinked ? "関連付け解除" : "関連付ける"}
          </Button>
        </TableCell>
      </TableRow>

      {isLinked && (
        <TableRow>
          <TableCell colSpan={4} sx={{ p: 0, borderTop: "none" }}>
            <Collapse in={isLinked} timeout="auto" unmountOnExit>
              <Box sx={{ px: "1rem", py: "0.5rem", backgroundColor: colors.grey[50] }}>
                {isMetaLoading && (
                  <Box sx={{ display: "flex", alignItems: "center", gap: "0.5rem" }}>
                    <CircularProgress size={14} />
                    <Typography variant="caption" color="text.secondary">
                      {"GRDM 登録情報を取得中..."}
                    </Typography>
                  </Box>
                )}
                {isMetaError && (
                  <Typography variant="caption" color="error">
                    {"GRDM 登録情報の取得に失敗しました。"}
                  </Typography>
                )}
                {!isMetaLoading && !isMetaError && !grdmMeta && (
                  <Typography variant="caption" color="text.secondary">
                    {"GRDM 登録情報はありません。"}
                  </Typography>
                )}
                {grdmMeta && (
                  <Box
                    sx={{
                      display: "grid",
                      gridTemplateColumns: "auto 1fr",
                      columnGap: "1rem",
                      rowGap: "0.1rem",
                    }}
                  >
                    {grdmMeta.funder && (
                      <>
                        <Typography variant="caption" color="text.secondary" sx={{ fontWeight: "bold" }}>
                          {"助成機関"}
                        </Typography>
                        <Typography variant="caption">{grdmMeta.funder}</Typography>
                      </>
                    )}
                    {grdmMeta.programNameJa && (
                      <>
                        <Typography variant="caption" color="text.secondary" sx={{ fontWeight: "bold" }}>
                          {"プログラム名"}
                        </Typography>
                        <Typography variant="caption">{grdmMeta.programNameJa}</Typography>
                      </>
                    )}
                    {grdmMeta.projectNameJa && (
                      <>
                        <Typography variant="caption" color="text.secondary" sx={{ fontWeight: "bold" }}>
                          {"プロジェクト名"}
                        </Typography>
                        <Typography variant="caption">{grdmMeta.projectNameJa}</Typography>
                      </>
                    )}
                    {grdmMeta.japanGrantNumber && (
                      <>
                        <Typography variant="caption" color="text.secondary" sx={{ fontWeight: "bold" }}>
                          {"課題番号"}
                        </Typography>
                        <Typography variant="caption">{grdmMeta.japanGrantNumber}</Typography>
                      </>
                    )}
                    {grdmMeta.fundingStreamCode && (
                      <>
                        <Typography variant="caption" color="text.secondary" sx={{ fontWeight: "bold" }}>
                          {"助成区分"}
                        </Typography>
                        <Typography variant="caption">{grdmMeta.fundingStreamCode}</Typography>
                      </>
                    )}
                  </Box>
                )}
              </Box>
            </Collapse>
          </TableCell>
        </TableRow>
      )}
    </>
  )
}

export default function ProjectTableSection({ sx, user, projects }: ProjectTableProps) {
  const { control } = useFormContext<DmpFormValues>()
  const { insert, remove } = useFieldArray<DmpFormValues, "dmp.linkedGrdmProjects">({
    control,
    name: "dmp.linkedGrdmProjects",
  })
  const linkingProjects = useWatch<DmpFormValues>({
    name: "dmp.linkedGrdmProjects",
    defaultValue: [],
  }) as DmpFormValues["dmp"]["linkedGrdmProjects"]

  const [searchQuery, setSearchQuery] = useState("")
  const [displayCount, setDisplayCount] = useState(10)
  const sentinelRef = useRef<HTMLTableRowElement>(null)

  const linkedProjectIds = linkingProjects.map((p) => p.projectId)
  const filtered = projects.filter((p) => !p.title.startsWith(DMP_PROJECT_PREFIX))
  const searchFiltered = filtered.filter((p) =>
    p.title.toLowerCase().includes(searchQuery.toLowerCase()),
  )
  const displayedProjects = searchFiltered.slice(0, displayCount)
  const hasMore = displayCount < searchFiltered.length

  useEffect(() => {
    if (!sentinelRef.current || !hasMore) return
    const observer = new IntersectionObserver(
      ([entry]) => {
        if (entry.isIntersecting) setDisplayCount((c) => c + 10)
      },
      { threshold: 0.1 },
    )
    observer.observe(sentinelRef.current)
    return () => observer.disconnect()
  }, [hasMore, displayCount])

  const { update: updateDataInfo } = useFieldArray<DmpFormValues, "dmp.dataInfo">({
    control,
    name: "dmp.dataInfo",
  })
  const dataInfos = useWatch<DmpFormValues>({
    name: "dmp.dataInfo",
    defaultValue: [],
  }) as DmpFormValues["dmp"]["dataInfo"]
  const [confirmDialogOpen, setConfirmDialogOpen] = useState(false)
  const [pendingUnlinkProjectId, setPendingUnlinkProjectId] = useState<string | null>(null)

  const handleLinkProject = (projectId: string) => {
    const existingProject = linkingProjects.find((p) => p.projectId === projectId)
    if (existingProject) return

    const indexInProjects = filtered.findIndex((p) => p.id === projectId)
    let insertIndex = linkingProjects.length
    for (let i = 0; i < linkingProjects.length; i++) {
      const currentProjectIndex = filtered.findIndex((p) => p.id === linkingProjects[i].projectId)
      if (currentProjectIndex > indexInProjects) {
        insertIndex = i
        break
      }
    }
    insert(insertIndex, { projectId })
  }

  const handleUnlinkProject = (projectId: string) => {
    const index = linkingProjects.findIndex((p) => p.projectId === projectId)
    if (index !== -1) {
      remove(index)
    }
  }

  const handleUnlinkProjectRequest = (projectId: string) => {
    const isLinkedToFiles = dataInfos.some((info) => info.linkedGrdmFiles.some((file) => file.projectId === projectId))

    if (isLinkedToFiles) {
      setPendingUnlinkProjectId(projectId)
      setConfirmDialogOpen(true)
    } else {
      handleUnlinkProject(projectId)
    }
  }

  const confirmUnlinkProject = () => {
    if (!pendingUnlinkProjectId) return

    dataInfos.forEach((info, index) => {
      const hasLinkedFileFromProject = info.linkedGrdmFiles.some((file) => file.projectId === pendingUnlinkProjectId)
      if (hasLinkedFileFromProject) {
        const updatedFiles = info.linkedGrdmFiles.filter((file) => file.projectId !== pendingUnlinkProjectId)
        updateDataInfo(index, { ...info, linkedGrdmFiles: updatedFiles })
      }
    })

    handleUnlinkProject(pendingUnlinkProjectId)
    setConfirmDialogOpen(false)
    setPendingUnlinkProjectId(null)
  }

  const cancelUnlinkProject = () => {
    setConfirmDialogOpen(false)
    setPendingUnlinkProjectId(null)
  }

  return (
    <Box sx={{ ...sx, display: "flex", flexDirection: "column" }}>
      <SectionHeader text="DMP と GRDM との関連付け" />
      <Typography sx={{ mt: "0.5rem" }}>
        {"DMP Project と GRDM Project との関連付けを行います。"}
        <br />
        {"あなたの GRDM アカウント上の GRDM Project 一覧です。"}
      </Typography>
      <TextField
        size="small"
        placeholder="プロジェクト名で検索"
        value={searchQuery}
        onChange={(e) => {
          setSearchQuery(e.target.value)
          setDisplayCount(10)
        }}
        slotProps={{
          input: {
            startAdornment: (
              <InputAdornment position="start">
                <Search fontSize="small" />
              </InputAdornment>
            ),
          },
        }}
        sx={{ mt: "1rem", width: "320px" }}
      />

      <Box sx={{ position: "relative", mt: "1rem" }}>
        <TableContainer component={Paper} variant="outlined" sx={{ borderBottom: "none", maxHeight: "530px", overflow: "auto" }}>
          <Table stickyHeader>
            <TableHead>
              <TableRow>
                <TableCell sx={{ fontWeight: "bold", textAlign: "left", p: "0.5rem 1rem", width: "40%", backgroundColor: colors.grey[100] }}>{"プロジェクト名"}</TableCell>
                <TableCell sx={{ fontWeight: "bold", textAlign: "center", p: "0.5rem 1rem", width: "20%", backgroundColor: colors.grey[100] }}>{"作成日"}</TableCell>
                <TableCell sx={{ fontWeight: "bold", textAlign: "center", p: "0.5rem 1rem", width: "20%", backgroundColor: colors.grey[100] }}>{"最終更新日"}</TableCell>
                <TableCell sx={{ fontWeight: "bold", textAlign: "center", p: "0.5rem 1rem", width: "20%", backgroundColor: colors.grey[100] }} />
              </TableRow>
            </TableHead>
            <TableBody>
              {displayedProjects.length === 0 ? (
                <TableRow>
                  <TableCell colSpan={4} sx={{ textAlign: "center", color: "text.secondary", py: "1.5rem" }}>
                    {"一致するプロジェクトがありません。"}
                  </TableCell>
                </TableRow>
              ) : (
                <>
                  {displayedProjects.map((project) => (
                    <ProjectRow
                      key={project.id}
                      project={project}
                      user={user}
                      isLinked={linkedProjectIds.includes(project.id)}
                      onLink={handleLinkProject}
                      onUnlinkRequest={handleUnlinkProjectRequest}
                    />
                  ))}
                  {hasMore && (
                    <TableRow ref={sentinelRef}>
                      <TableCell colSpan={4} sx={{ textAlign: "center", py: "1rem", borderBottom: "none" }}>
                        <CircularProgress size={20} />
                      </TableCell>
                    </TableRow>
                  )}
                </>
              )}
            </TableBody>
          </Table>
        </TableContainer>

        {hasMore && (
          <Box
            sx={{
              position: "absolute",
              bottom: 0,
              left: 0,
              right: 0,
              height: "64px",
              background: "linear-gradient(transparent, white)",
              pointerEvents: "none",
              borderRadius: "0 0 4px 4px",
            }}
          />
        )}
      </Box>

      <Dialog
        open={confirmDialogOpen}
        onClose={() => setConfirmDialogOpen(false)}
        fullWidth
        maxWidth="sm"
        closeAfterTransition={false}
      >
        <DialogTitle sx={{ mt: "0.5rem", mx: "1rem" }}>
          {"DMP と GRDM との関連付けの解除"}
        </DialogTitle>
        <DialogContent sx={{ display: "flex", flexDirection: "column", gap: "1rem", mt: "0.5rem", mx: "1rem" }}>
          <Box sx={{ display: "flex", flexDirection: "column", gap: "1rem" }}>
            <Typography>
              {"この GRDM プロジェクト内のファイルが、DMP の研究データ情報にリンクされています。"}
              <br />
              {"関連付けを解除すると、これらのリンクは削除されます。"}
              <br />
              <span style={{ fontWeight: "bold" }}>
                {"本当に関連付けを解除しますか？"}
              </span>
            </Typography>
          </Box>
        </DialogContent>
        <DialogActions sx={{ m: "0.5rem 1.5rem 1.5rem" }}>
          <Button
            variant="contained"
            color="secondary"
            onClick={confirmUnlinkProject}
          >
            {"解除する"}
          </Button>
          <Button children="キャンセル" onClick={cancelUnlinkProject} variant="outlined" color="secondary" />
        </DialogActions>
      </Dialog>
    </Box>
  )
}
