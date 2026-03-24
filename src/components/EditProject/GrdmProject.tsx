import OpenInNew from "@mui/icons-material/OpenInNew"
import { Box, Typography, Link } from "@mui/material"
import { SxProps } from "@mui/system"
import { useTranslation } from "react-i18next"

import { ProjectInfo } from "@/grdmClient"

export interface GrdmProjectProps {
  sx?: SxProps
  isNew: boolean
  project?: ProjectInfo | null
}

function NewGrdmProject() {
  const { t } = useTranslation("editProject")
  return (
    <Typography>
      {t("grdmProject.newDescription1")}
      <br />
      {t("grdmProject.newDescription2")}
      <Typography component="span" sx={{ fontFamily: "monospace" }}>
        {t("grdmProject.newDescription3")}
      </Typography>
      {t("grdmProject.newDescription4")}
    </Typography>
  )
}

function ExistingGrdmProject({ project }: { project?: ProjectInfo | null }) {
  const { t } = useTranslation("editProject")
  return (
    <>
      <Typography>
        {t("grdmProject.existingDescription")}
      </Typography>
      {project?.html && (
        <Link
          href={project.html}
          target="_blank"
          rel="noopener noreferrer"
          sx={{
            display: "inline-flex",
            alignItems: "center",
            gap: "0.5rem",
            textDecoration: "none",
            mt: "0.5rem",
            fontSize: "1.1rem",
          }}
        >
          {project.title}
          <OpenInNew sx={{ fontSize: "1rem" }} />
        </Link>
      )}
    </>
  )
}

export default function GrdmProject({ sx, isNew, project }: GrdmProjectProps) {
  return (
    <Box sx={sx}>
      {isNew ? <NewGrdmProject /> : <ExistingGrdmProject project={project} />}
    </Box>
  )
}
