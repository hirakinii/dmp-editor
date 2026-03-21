import { Box, ToggleButton, ToggleButtonGroup, Typography } from "@mui/material"
import { SxProps } from "@mui/system"
import { useFormContext, useWatch } from "react-hook-form"

import DmpMetadataSection from "@/components/EditProject/DmpMetadataSection"
import GrdmProject from "@/components/EditProject/GrdmProject"
import { DmpFormValues, researchPhases } from "@/dmp"
import type { ResearchPhase } from "@/dmp"
import { ProjectInfo } from "@/grdmClient"

export interface DmpMetaSectionProps {
  sx?: SxProps
  isNew: boolean
  project?: ProjectInfo | null
  projects: ProjectInfo[]
}

export default function DmpMetaSection({ sx, isNew, project, projects }: DmpMetaSectionProps) {
  const { control, setValue } = useFormContext<DmpFormValues>()
  const researchPhase = useWatch({ control, name: "dmp.metadata.researchPhase" }) as ResearchPhase

  return (
    <Box sx={sx}>
      <Box sx={{ display: "flex", flexDirection: "row", alignItems: "center", gap: "1rem" }}>
        <Typography sx={{ fontSize: "0.9rem", fontWeight: "bold" }}>{"研究フェーズ:"}</Typography>
        <ToggleButtonGroup
          value={researchPhase}
          exclusive
          size="small"
          onChange={(_, value: ResearchPhase | null) => {
            if (value !== null) setValue("dmp.metadata.researchPhase", value)
          }}
        >
          {researchPhases.map((phase) => (
            <ToggleButton key={phase} value={phase} sx={{ textTransform: "none", px: "1.5rem" }}>
              {phase}
            </ToggleButton>
          ))}
        </ToggleButtonGroup>
      </Box>
      <GrdmProject sx={{ mt: "1rem" }} isNew={isNew} project={project} projects={projects} />
      <DmpMetadataSection sx={{ mt: "1.5rem" }} isNew={isNew} />
    </Box>
  )
}
