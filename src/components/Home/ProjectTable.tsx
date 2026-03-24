import DownloadingOutlined from "@mui/icons-material/DownloadingOutlined"
import EditOutlined from "@mui/icons-material/EditOutlined"
import InfoOutlined from "@mui/icons-material/InfoOutlined"
import {
  Box,
  Button,
  CircularProgress,
  IconButton,
  Paper,
  Table,
  TableBody,
  TableCell,
  TableContainer,
  TableHead,
  TableRow,
  Tooltip,
  Typography,
  colors,
} from "@mui/material"
import { SxProps } from "@mui/system"
import { useState } from "react"
import { useTranslation } from "react-i18next"
import { useNavigate } from "react-router"
import { useRecoilValue } from "recoil"

import grdmLogoMark from "@/assets/grdm_logo_mark.png"
import OurCard from "@/components/OurCard"
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
  const { t } = useTranslation("home")
  return (
    <TableHead sx={{ backgroundColor: colors.grey[100] }}>
      <TableRow>
        <TableCell sx={{ fontWeight: "bold", textAlign: "left", p: "0.5rem 1rem", width: "35%" }}>
          {t("projectTable.colProjectName")}
        </TableCell>
        <TableCell sx={{ fontWeight: "bold", textAlign: "center", p: "0.5rem 1rem", width: "15%" }}>
          {t("projectTable.colCreatedAt")}
        </TableCell>
        <TableCell sx={{ fontWeight: "bold", textAlign: "center", p: "0.5rem 1rem", width: "15%" }}>
          {t("projectTable.colUpdatedAt")}
        </TableCell>
        <TableCell sx={{ fontWeight: "bold", textAlign: "center", p: "0.5rem 1rem", width: "35%" }}>
          {t("projectTable.colActions")}
        </TableCell>
      </TableRow>
    </TableHead>
  )
}

/**
 * Renders a single project row with edit and export buttons.
 */
function ProjectTableRow({ project, user }: { project: ProjectInfo; user: User }) {
  const { t } = useTranslation("home")
  const navigate = useNavigate()
  const token = useRecoilValue(tokenAtom)
  const { showSnackbar } = useSnackbar()
  const [isExporting, setIsExporting] = useState(false)

  const handleExport = async () => {
    setIsExporting(true)
    try {
      const { dmp } = await readDmpFile(token, project.id)
      const blob = await exportToJspsExcel(dmp)
      triggerDownload(blob, `dmp-jsps-${project.title}.xlsx`)
    } catch {
      showSnackbar(t("projectTable.exportFailed"), "error")
    } finally {
      setIsExporting(false)
    }
  }

  return (
    <TableRow key={project.id}>
      <TableCell sx={{ textAlign: "left", p: "0.5rem 1rem", width: "35%" }}>
        {project.title}
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
            {t("projectTable.detail")}
          </Button>
          <Button
            variant="outlined"
            color="primary"
            size="small"
            onClick={() => navigate(`/projects/${project.id}`)}
            startIcon={<EditOutlined />}
          >
            {t("projectTable.edit")}
          </Button>
          <Button
            variant="outlined"
            color="secondary"
            size="small"
            onClick={handleExport}
            startIcon={isExporting ? <CircularProgress size={14} color="inherit" /> : <DownloadingOutlined />}
            disabled={isExporting}
            aria-label={t("projectTable.export")}
          >
            {t("projectTable.export")}
          </Button>
          <Tooltip title={t("projectTable.openGrdm")}>
            <IconButton
              component="a"
              href={project.html}
              target="_blank"
              rel="noopener noreferrer"
              aria-label="GRDM"
              size="small"
            >
              <Box component="img" src={grdmLogoMark} alt="GRDM" sx={{ width: 24, height: 24 }} />
            </IconButton>
          </Tooltip>
        </Box>
      </TableCell>
    </TableRow>
  )
}

export default function ProjectTable({ sx, user, projects }: ProjectTableProps) {
  const { t } = useTranslation("home")
  const navigate = useNavigate()
  const filtered = projects.filter((p) => p.title.startsWith(DMP_PROJECT_PREFIX))

  return (
    <OurCard sx={sx}>
      <Typography sx={{ fontSize: "1.5rem" }} component="h1">
        {t("projectTable.title")}
      </Typography>
      <Box sx={{ display: "flex", flexDirection: "row", alignItems: "center", gap: "1.5rem", mt: "0.5rem" }}>
        {filtered.length !== 0 ? (
          <Box sx={{ display: "flex", flexDirection: "column", width: "100%" }}>
            <Typography>{t("projectTable.description")}</Typography>
            <Box sx={{ mt: "1rem" }}>
              <Button
                variant="contained"
                color="secondary"
                onClick={() => navigate("/projects/new")}
                sx={{ textTransform: "none" }}
              >
                {t("projectTable.createNew")}
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
            <Typography>{t("projectTable.noProjects")}</Typography>
            <Box sx={{ mt: "1rem" }}>
              <Button variant="contained" color="secondary" onClick={() => navigate("/projects/new")} sx={{ textTransform: "none" }}>
                {t("projectTable.createNew")}
              </Button>
            </Box>
          </Box>
        )}
      </Box>
    </OurCard>
  )
}
