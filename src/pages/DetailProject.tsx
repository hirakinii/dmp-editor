import DownloadingOutlined from "@mui/icons-material/DownloadingOutlined"
import {
  Box,
  Button,
  CircularProgress,
  IconButton,
  Table,
  TableBody,
  TableCell,
  TableContainer,
  TableHead,
  TableRow,
  Tooltip,
  Typography,
  colors,
  Paper,
} from "@mui/material"
import { useState } from "react"
import { useErrorBoundary } from "react-error-boundary"
import { Link, useParams } from "react-router-dom"

import grdmLogoMark from "@/assets/grdm_logo_mark.png"
import Frame from "@/components/Frame"
import Loading from "@/components/Loading"
import OurCard from "@/components/OurCard"
import { GRDM_CONFIG } from "@/config"
import type { DataInfo, PersonInfo } from "@/dmp"
import { useDmp } from "@/hooks/useDmp"
import { exportToJspsExcel } from "@/jspsExport"

// --- Sub-components ---

interface LabelValueRowProps {
  label: string
  value?: string | number | null
}

function LabelValueRow({ label, value }: LabelValueRowProps) {
  return (
    <Box sx={{ display: "flex", gap: "1rem", alignItems: "flex-start", py: "0.3rem" }}>
      <Typography sx={{ fontWeight: "bold", minWidth: "14rem", color: colors.grey[700] }}>
        {label}
      </Typography>
      <Typography>{value ?? "—"}</Typography>
    </Box>
  )
}

interface SectionTitleProps {
  children: React.ReactNode
}

function SectionTitle({ children }: SectionTitleProps) {
  return (
    <Typography
      sx={{
        fontSize: "1.1rem",
        fontWeight: "bold",
        mt: "1.5rem",
        mb: "0.5rem",
        pb: "0.3rem",
        borderBottom: `2px solid ${colors.grey[300]}`,
      }}
    >
      {children}
    </Typography>
  )
}

function PersonInfoTable({ persons }: { persons: PersonInfo[] }) {
  return (
    <TableContainer component={Paper} variant="outlined" sx={{ mt: "0.5rem" }}>
      <Table size="small">
        <TableHead sx={{ backgroundColor: colors.grey[100] }}>
          <TableRow>
            <TableCell sx={{ fontWeight: "bold" }}>{"役割"}</TableCell>
            <TableCell sx={{ fontWeight: "bold" }}>{"姓"}</TableCell>
            <TableCell sx={{ fontWeight: "bold" }}>{"名"}</TableCell>
            <TableCell sx={{ fontWeight: "bold" }}>{"所属機関"}</TableCell>
            <TableCell sx={{ fontWeight: "bold" }}>{"e-Rad 研究者番号"}</TableCell>
            <TableCell sx={{ fontWeight: "bold" }}>{"ORCID"}</TableCell>
            <TableCell sx={{ fontWeight: "bold" }}>{"連絡先"}</TableCell>
          </TableRow>
        </TableHead>
        <TableBody>
          {persons.map((p, i) => (
            <TableRow key={i}>
              <TableCell>{p.role.join("、")}</TableCell>
              <TableCell>{p.lastName}</TableCell>
              <TableCell>{p.firstName}</TableCell>
              <TableCell>{p.affiliation}</TableCell>
              <TableCell>{p.eRadResearcherId ?? "—"}</TableCell>
              <TableCell>{p.orcid ?? "—"}</TableCell>
              <TableCell>{p.contact ?? "—"}</TableCell>
            </TableRow>
          ))}
        </TableBody>
      </Table>
    </TableContainer>
  )
}

function DataInfoTable({ dataList }: { dataList: DataInfo[] }) {
  return (
    <TableContainer component={Paper} variant="outlined" sx={{ mt: "0.5rem" }}>
      <Table size="small">
        <TableHead sx={{ backgroundColor: colors.grey[100] }}>
          <TableRow>
            <TableCell sx={{ fontWeight: "bold" }}>{"データ名称"}</TableCell>
            <TableCell sx={{ fontWeight: "bold" }}>{"データの分野"}</TableCell>
            <TableCell sx={{ fontWeight: "bold" }}>{"データ種別"}</TableCell>
            <TableCell sx={{ fontWeight: "bold" }}>{"アクセス権"}</TableCell>
            <TableCell sx={{ fontWeight: "bold" }}>{"データ管理機関"}</TableCell>
          </TableRow>
        </TableHead>
        <TableBody>
          {dataList.map((d, i) => (
            <TableRow key={i}>
              <TableCell>{d.dataName}</TableCell>
              <TableCell>{d.researchField}</TableCell>
              <TableCell>{d.dataType}</TableCell>
              <TableCell>{d.accessRights}</TableCell>
              <TableCell>{d.dataManagementAgency}</TableCell>
            </TableRow>
          ))}
        </TableBody>
      </Table>
    </TableContainer>
  )
}

// --- Main page ---

export default function DetailProject() {
  const { projectId = "" } = useParams<{ projectId: string }>()
  const dmpQuery = useDmp(projectId)
  const { showBoundary } = useErrorBoundary()
  const [isDownloading, setIsDownloading] = useState(false)

  const handleDownload = async () => {
    setIsDownloading(true)
    try {
      const name = dmpQuery.data?.projectInfo.projectName || "untitled"
      const blob = await exportToJspsExcel(dmpQuery.data!)
      const filename = `dmp-jsps-${name}.xlsx`
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

  if (dmpQuery.isLoading) {
    return (
      <Frame noAuth>
        <Loading msg="Loading..." />
      </Frame>
    )
  }

  if (dmpQuery.error) throw dmpQuery.error

  const dmp = dmpQuery.data
  if (!dmp) return null

  return (
    <Frame>
      <OurCard sx={{ mt: "1.5rem" }}>
        {/* Header */}
        <Box sx={{ display: "flex", justifyContent: "space-between", alignItems: "center" }}>
          <Typography sx={{ fontSize: "1.5rem" }} component="h1">
            {`DMP「${dmp.projectInfo.projectName}」`}
          </Typography>
          <Box sx={{ display: "flex", gap: "0.5rem", alignItems: "center" }}>
            <Button
              component={Link}
              to={`/projects/${projectId}`}
              variant="contained"
              color="primary"
            >
              {"編集する"}
            </Button>
            <Button
              variant="contained"
              color="secondary"
              onClick={handleDownload}
              disabled={isDownloading}
              startIcon={isDownloading ? <CircularProgress size={20} /> : <DownloadingOutlined />}
            >
              {isDownloading ? "出力中..." : "出力"}
            </Button>
            <Tooltip title="GRDM プロジェクトを開く">
              <IconButton
                component="a"
                href={`${GRDM_CONFIG.BASE_URL}/${projectId}`}
                target="_blank"
                rel="noopener noreferrer"
                aria-label="GRDM"
              >
                <Box
                  component="img"
                  src={grdmLogoMark}
                  alt="GRDM"
                  sx={{ width: 28, height: 28 }}
                />
              </IconButton>
            </Tooltip>
          </Box>
        </Box>

        {/* DMP 作成・更新情報 */}
        <SectionTitle>{"DMP 作成・更新情報"}</SectionTitle>
        <LabelValueRow label="DMP 作成年月日" value={dmp.metadata.dateCreated} />
        <LabelValueRow label="DMP 最終更新年月日" value={dmp.metadata.dateModified} />
        <LabelValueRow label="研究フェーズ" value={dmp.metadata.researchPhase} />
        <LabelValueRow label="種別" value={dmp.metadata.revisionType} />
        <LabelValueRow label="提出日" value={dmp.metadata.submissionDate} />

        {/* 研究課題情報 */}
        <SectionTitle>{"研究課題情報"}</SectionTitle>
        <LabelValueRow label="資金配分機関" value={dmp.projectInfo.fundingAgency} />
        <LabelValueRow label="プログラム名" value={dmp.projectInfo.programName} />
        <LabelValueRow label="プログラム情報コード" value={dmp.projectInfo.programCode} />
        <LabelValueRow label="体系的番号" value={dmp.projectInfo.projectCode} />
        <LabelValueRow label="プロジェクト名" value={dmp.projectInfo.projectName} />
        <LabelValueRow label="採択年度" value={dmp.projectInfo.adoptionYear} />
        <LabelValueRow label="事業開始年度" value={dmp.projectInfo.startYear} />
        <LabelValueRow label="事業終了年度" value={dmp.projectInfo.endYear} />

        {/* 担当者情報 */}
        <SectionTitle>{"担当者情報"}</SectionTitle>
        <PersonInfoTable persons={dmp.personInfo} />

        {/* 研究データ情報 */}
        <SectionTitle>{"研究データ情報"}</SectionTitle>
        <DataInfoTable dataList={dmp.dataInfo} />
      </OurCard>
    </Frame>
  )
}
