import DownloadingOutlined from "@mui/icons-material/DownloadingOutlined"
import KeyboardArrowDownOutlined from "@mui/icons-material/KeyboardArrowDownOutlined"
import { Typography, Button, CircularProgress, Menu, MenuItem } from "@mui/material"
import { SxProps } from "@mui/system"
import { useState } from "react"
import { useErrorBoundary } from "react-error-boundary"

import OurCard from "@/components/OurCard"
import type { Dmp } from "@/dmp"
import { exportToExcel } from "@/excelExport"
import { exportToJspsExcel } from "@/jspsExport"

export interface ExportDmpCardProps {
  sx?: SxProps
  dmp: Dmp
  projectName: string
}

export default function ExportDmpCard({ sx, dmp, projectName }: ExportDmpCardProps) {
  const { showBoundary } = useErrorBoundary()
  const [isDownloading, setIsDownloading] = useState(false)
  const [anchorEl, setAnchorEl] = useState<null | HTMLElement>(null)

  const handleOpenMenu = (event: React.MouseEvent<HTMLElement>) => {
    setAnchorEl(event.currentTarget)
  }

  const handleCloseMenu = () => {
    setAnchorEl(null)
  }

  const handleDownload = async (format: "sample" | "jsps") => {
    handleCloseMenu()
    setIsDownloading(true)
    try {
      const name = projectName || "untitled"
      const blob = format === "jsps" ? await exportToJspsExcel(dmp) : await exportToExcel(dmp)
      const filename = `dmp-${format}-${name}.xlsx`
      const url = URL.createObjectURL(blob)
      const a = document.createElement("a")
      a.href = url
      a.download = filename
      a.click()
      URL.revokeObjectURL(url)
    } catch (error) {
      showBoundary(error)
    } finally {
      setIsDownloading(false)
    }
  }

  return (
    <OurCard sx={sx}>
      <Typography sx={{ fontSize: "1.5rem" }} component="h1">
        DMP の出力
      </Typography>
      <Button
        variant="contained"
        color="secondary"
        onClick={handleOpenMenu}
        sx={{
          textTransform: "none",
          width: "180px",
          mt: "1.5rem",
        }}
        disabled={isDownloading}
        startIcon={
          isDownloading ? <CircularProgress size={20} /> : <DownloadingOutlined />
        }
        endIcon={<KeyboardArrowDownOutlined />}
      >
        {isDownloading ? "出力中..." : "DMP を出力する"}
      </Button>
      <Menu
        anchorEl={anchorEl}
        open={Boolean(anchorEl)}
        onClose={handleCloseMenu}
      >
        <MenuItem onClick={() => handleDownload("sample")}>サンプル形式</MenuItem>
        <MenuItem onClick={() => handleDownload("jsps")}>JSPS 形式</MenuItem>
      </Menu>
    </OurCard>
  )
}
