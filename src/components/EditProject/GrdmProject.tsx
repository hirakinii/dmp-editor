import OpenInNew from "@mui/icons-material/OpenInNew"
import { Box, Typography, Link } from "@mui/material"
import { SxProps } from "@mui/system"

import { ProjectInfo } from "@/grdmClient"

export interface GrdmProjectProps {
  sx?: SxProps
  isNew: boolean
  project?: ProjectInfo | null
}

function NewGrdmProject() {
  return (
    <Typography>
      {"DMP の情報は、新しく作成する GRDM プロジェクトに保存されます。"}
      <br />
      {"保存先プロジェクト名は「プロジェクト情報」で入力する「プロジェクト名」をもとに"}
      <Typography component="span" sx={{ fontFamily: "monospace" }}>
        {"DMP-[プロジェクト名]"}
      </Typography>
      {"として自動決定されます。"}
    </Typography>
  )
}

function ExistingGrdmProject({ project }: { project?: ProjectInfo | null }) {
  return (
    <>
      <Typography>
        {"DMP Project は、以下の GRDM プロジェクト内に保存されています。"}
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
