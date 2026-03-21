import SearchIcon from "@mui/icons-material/Search"
import { Box, TextField, FormControl, MenuItem, Link, Button, CircularProgress, InputAdornment } from "@mui/material"
import { SxProps } from "@mui/system"
import React, { useState } from "react"
import { useFormContext, Controller } from "react-hook-form"

import HelpChip from "@/components/EditProject/HelpChip"
import OurFormLabel from "@/components/EditProject/OurFormLabel"
import SectionHeader from "@/components/EditProject/SectionHeader"
import type { ProjectInfo, DmpFormValues } from "@/dmp"
import { useKakenProject } from "@/hooks/useKakenProject"
import { useSnackbar } from "@/hooks/useSnackbar"

interface FormData {
  key: keyof ProjectInfo
  label: string
  required: boolean
  width: string
  helperText?: string
  type: "text" | "date" | "select"
  options?: string[]
  helpChip?: React.ReactNode
}

const formData: FormData[] = [
  {
    key: "fundingAgency",
    label: "資金配分機関情報",
    required: true,
    width: "480px",
    type: "text",
  },
  {
    key: "programName",
    label: "プログラム名 (事業名・種目名)",
    required: false,
    width: "480px",
    type: "text",
    helpChip: (
      <>
        {"NISTEP 体系的番号一覧 ("}
        <Link
          href="https://www.nistep.go.jp/taikei"
          target="_blank"
          rel="noopener noreferrer"
          children="https://www.nistep.go.jp/taikei"
        />
        {") の「事業・制度名」を記載してください。"}
      </>
    ),
  },
  {
    key: "programCode",
    label: "体系的番号におけるプログラム情報コード",
    required: false,
    width: "480px",
    type: "text",
    helpChip: (
      <>
        {"NISTEP 体系的番号一覧 ("}
        <Link
          href="https://www.nistep.go.jp/taikei"
          target="_blank"
          rel="noopener noreferrer"
          children="https://www.nistep.go.jp/taikei"
        />
        {") に掲載されている「機関コード」および「施策・事業の特定コード」を表すコードを記載してください。"}
      </>

    ),
  },
  {
    key: "projectCode",
    label: "体系的番号",
    required: true,
    width: "480px",
    type: "text",
  },
  {
    key: "projectName",
    label: "プロジェクト名",
    required: true,
    width: "480px",
    type: "text",
  },
  {
    key: "adoptionYear",
    label: "採択年度",
    required: false,
    width: "480px",
    type: "text",
  },
  {
    key: "startYear",
    label: "事業開始年度",
    required: false,
    width: "480px",
    type: "text",
  },
  {
    key: "endYear",
    label: "事業終了年度",
    required: false,
    width: "480px",
    type: "text",
  },
]

interface ProjectInfoSectionProps {
  sx?: SxProps
}

/** Inner component that handles KAKEN search with the hook. */
function KakenSearchPanel() {
  const { setValue } = useFormContext<DmpFormValues>()
  const [kakenNumber, setKakenNumber] = useState("")
  const { refetch, isFetching } = useKakenProject(kakenNumber)
  const { showSnackbar } = useSnackbar()

  const handleSearch = async () => {
    if (!kakenNumber.trim()) return
    const result = await refetch()
    if (result.isSuccess && result.data) {
      const info = result.data
      setValue("dmp.projectInfo.fundingAgency", info.fundingAgency)
      setValue("dmp.projectInfo.programName", info.programName)
      setValue("dmp.projectInfo.programCode", info.programCode)
      setValue("dmp.projectInfo.projectCode", info.projectCode)
      setValue("dmp.projectInfo.projectName", info.projectName)
      setValue("dmp.projectInfo.adoptionYear", info.adoptionYear)
      setValue("dmp.projectInfo.startYear", info.startYear)
      setValue("dmp.projectInfo.endYear", info.endYear)
    } else if (result.isSuccess && result.data === null) {
      showSnackbar("KAKEN番号に該当するプロジェクトが見つかりませんでした", "warning")
    } else if (result.isError) {
      showSnackbar("情報の取得に失敗しました", "error")
    }
  }

  return (
    <Box sx={{ display: "flex", flexDirection: "column", gap: "0.5rem", mb: "1rem" }}>
      <Box sx={{ display: "flex", flexDirection: "row", alignItems: "center", gap: "0.5rem" }}>
        <TextField
          label="KAKEN番号で自動補完"
          placeholder="例: 23K12345"
          value={kakenNumber}
          onChange={(e) => setKakenNumber(e.target.value)}
          size="small"
          sx={{ maxWidth: "300px" }}
          slotProps={{
            input: {
              startAdornment: (
                <InputAdornment position="start">
                  <SearchIcon fontSize="small" />
                </InputAdornment>
              ),
            },
          }}
          onKeyDown={(e) => {
            if (e.key === "Enter") handleSearch()
          }}
        />
        <Button
          variant="outlined"
          size="small"
          onClick={handleSearch}
          disabled={isFetching || !kakenNumber.trim()}
          startIcon={isFetching ? <CircularProgress size={16} /> : undefined}
        >
          {isFetching ? "検索中..." : "検索"}
        </Button>
      </Box>
    </Box>
  )
}

export default function ProjectInfoSection({ sx }: ProjectInfoSectionProps) {
  const { control } = useFormContext<DmpFormValues>()

  return (
    <Box sx={{ ...sx, display: "flex", flexDirection: "column" }}>
      <SectionHeader text="プロジェクト情報" />
      <Box sx={{ display: "flex", flexDirection: "column", gap: "1rem", mt: "1rem" }}>
        <KakenSearchPanel />
        {formData.map(({ key, label, required, width, helperText, type, options, helpChip }) => (
          <Controller
            key={key}
            name={`dmp.projectInfo.${key}`}
            control={control}
            rules={required ? { required: `${label} は必須です` } : {}}
            render={({ field, fieldState: { error } }) => (
              <FormControl fullWidth>
                <Box sx={{ display: "flex", flexDirection: "row", alignItems: "center" }}>
                  <OurFormLabel label={label} required={required} />
                  {helpChip && <HelpChip text={helpChip} />}
                </Box>
                <TextField
                  {...field}
                  fullWidth
                  variant="outlined"
                  error={!!error}
                  helperText={error?.message ?? helperText}
                  value={field.value ?? ""}
                  onChange={(e) => field.onChange(e.target.value === "" ? undefined : e.target.value)}
                  sx={{ maxWidth: width }}
                  type={type === "date" ? "date" : "text"}
                  select={type === "select"}
                  size="small"
                >
                  {type === "select" &&
                    options!.map((option) => (
                      <MenuItem key={option} value={option} children={option} />
                    ))}
                </TextField>
              </FormControl>
            )}
          />
        ))}
      </Box>
    </Box>
  )
}
