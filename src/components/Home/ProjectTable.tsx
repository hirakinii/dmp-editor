import DownloadingOutlined from "@mui/icons-material/DownloadingOutlined"
import EditOutlined from "@mui/icons-material/EditOutlined"
import InfoOutlined from "@mui/icons-material/InfoOutlined"
import OpenInNew from "@mui/icons-material/OpenInNew"
import {
  Box,
  Button,
  CircularProgress,
  Link,
  Menu,
  MenuItem,
  Paper,
  Table,
  TableBody,
  TableCell,
  TableContainer,
  TableHead,
  TableRow,
  Typography,
  colors,
} from "@mui/material"
import { SxProps } from "@mui/system"
import { MouseEvent, useState } from "react"
import { useNavigate } from "react-router"
import { useRecoilValue } from "recoil"

import OurCard from "@/components/OurCard"
import { exportToExcel } from "@/excelExport"
import { DMP_PROJECT_PREFIX, ProjectInfo, formatDateToTimezone, readDmpFile } from "@/grdmClient"
import { useSnackbar } from "@/hooks/useSnackbar"
import { User } from "@/hooks/useUser"
import { exportToJspsExcel } from "@/jspsExport"
import { tokenAtom } from "@/store/token"

interface ProjectTableProps {
  sx?: SxProps
  user: User
  projects: ProjectInfo[]
}

/**
 * Triggers a file download in the browser.
 */
function triggerDownload(blob: Blob, filename: string): void {
  const url = URL.createObjectURL(blob)
  const a = document.createElement("a")
  a.href = url
  a.download = filename
  a.click()
  URL.revokeObjectURL(url)
}

/**
 * Renders table header for ProjectTable
 */
function ProjectTableHeader() {
  return (
    <TableHead sx={{ backgroundColor: colors.grey[100] }}>
      <TableRow>
        <TableCell sx={{ fontWeight: "bold", textAlign: "left", p: "0.5rem 1rem", width: "35%" }}>
          {"プロジェクト名"}
        </TableCell>
        <TableCell sx={{ fontWeight: "bold", textAlign: "center", p: "0.5rem 1rem", width: "15%" }}>
          {"作成日"}
        </TableCell>
        <TableCell sx={{ fontWeight: "bold", textAlign: "center", p: "0.5rem 1rem", width: "15%" }}>
          {"最終更新日"}
        </TableCell>
        <TableCell sx={{ fontWeight: "bold", textAlign: "center", p: "0.5rem 1rem", width: "35%" }}>
          {"操作"}
        </TableCell>
      </TableRow>
    </TableHead>
  )
}

/**
 * Renders a single project row with edit and export buttons.
 */
function ProjectTableRow({ project, user }: { project: ProjectInfo; user: User }) {
  const navigate = useNavigate()
  const token = useRecoilValue(tokenAtom)
  const { showSnackbar } = useSnackbar()
  const [menuAnchor, setMenuAnchor] = useState<HTMLElement | null>(null)
  const [isExporting, setIsExporting] = useState(false)

  const handleExportClick = (event: MouseEvent<HTMLButtonElement>) => {
    setMenuAnchor(event.currentTarget)
  }

  const handleMenuClose = () => {
    setMenuAnchor(null)
  }

  const handleExport = async (format: "jsps" | "sample") => {
    handleMenuClose()
    setIsExporting(true)
    try {
      const { dmp } = await readDmpFile(token, project.id)
      if (format === "jsps") {
        const blob = await exportToJspsExcel(dmp)
        triggerDownload(blob, `dmp-jsps-${project.title}.xlsx`)
      } else {
        const blob = await exportToExcel(dmp)
        triggerDownload(blob, `dmp-sample-${project.title}.xlsx`)
      }
    } catch {
      showSnackbar("エクスポートに失敗しました", "error")
    } finally {
      setIsExporting(false)
    }
  }

  return (
    <TableRow key={project.id}>
      <TableCell sx={{ textAlign: "left", p: "0.5rem 1rem", width: "35%" }}>
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
      <TableCell sx={{ textAlign: "center", p: "0.5rem 1rem", width: "15%" }}>
        {formatDateToTimezone(project.dateCreated, user.timezone)}
      </TableCell>
      <TableCell sx={{ textAlign: "center", p: "0.5rem 1rem", width: "15%" }}>
        {formatDateToTimezone(project.dateModified, user.timezone)}
      </TableCell>
      <TableCell sx={{ textAlign: "center", p: "0.5rem 1rem", width: "35%" }}>
        <Box sx={{ display: "inline-flex", gap: "0.5rem", alignItems: "center" }}>
          <Button
            variant="outlined"
            color="info"
            size="small"
            onClick={() => navigate(`/projects/${project.id}/detail`)}
            startIcon={<InfoOutlined />}
          >
            {"詳細"}
          </Button>
          <Button
            variant="outlined"
            color="primary"
            size="small"
            onClick={() => navigate(`/projects/${project.id}`)}
            startIcon={<EditOutlined />}
          >
            {"編集"}
          </Button>
          <Button
            variant="outlined"
            color="secondary"
            size="small"
            onClick={handleExportClick}
            startIcon={isExporting ? <CircularProgress size={14} color="inherit" /> : <DownloadingOutlined />}
            disabled={isExporting}
            aria-label="Export"
          >
            {"Export"}
            {"\u25BC"}
          </Button>
          <Menu anchorEl={menuAnchor} open={Boolean(menuAnchor)} onClose={handleMenuClose}>
            <MenuItem onClick={() => handleExport("sample")}>{"サンプル形式"}</MenuItem>
            <MenuItem onClick={() => handleExport("jsps")}>{"JSPS 形式"}</MenuItem>
          </Menu>
        </Box>
      </TableCell>
    </TableRow>
  )
}

export default function ProjectTable({ sx, user, projects }: ProjectTableProps) {
  const navigate = useNavigate()
  const filtered = projects.filter((p) => p.title.startsWith(DMP_PROJECT_PREFIX))

  return (
    <OurCard sx={sx}>
      <Typography sx={{ fontSize: "1.5rem" }} component="h1">
        {"DMP Project 一覧"}
      </Typography>
      <Box sx={{ display: "flex", flexDirection: "row", alignItems: "center", gap: "1.5rem", mt: "0.5rem" }}>
        {filtered.length !== 0 ? (
          <Box sx={{ display: "flex", flexDirection: "column", width: "100%" }}>
            <Typography>{"あなたの GRDM アカウントに紐づく DMP Project 一覧です。"}</Typography>
            <Box sx={{ mt: "1rem" }}>
              <Button
                variant="contained"
                color="secondary"
                onClick={() => navigate("/projects/new")}
                sx={{ textTransform: "none" }}
              >
                {"新規 DMP Project を作成する"}
              </Button>
            </Box>
            <TableContainer component={Paper} variant="outlined" sx={{ borderBottom: "none", mt: "1.5rem" }}>
              <Table>
                <ProjectTableHeader />
                <TableBody>
                  {filtered.map((project) => (
                    <ProjectTableRow key={project.id} project={project} user={user} />
                  ))}
                </TableBody>
              </Table>
            </TableContainer>
          </Box>
        ) : (
          <Box sx={{ display: "flex", flexDirection: "column", width: "100%" }}>
            <Typography>Project がありません。</Typography>
            <Box sx={{ mt: "1rem" }}>
              <Button variant="contained" color="secondary" onClick={() => navigate("/projects/new")} sx={{ textTransform: "none" }}>
                {"新規 DMP Project を作成する"}
              </Button>
            </Box>
          </Box>
        )}
      </Box>
    </OurCard>
  )
}
