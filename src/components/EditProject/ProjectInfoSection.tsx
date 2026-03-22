import SearchIcon from "@mui/icons-material/Search"
import {
  Box, Button, CircularProgress, Dialog, DialogActions, DialogContent, DialogTitle,
  FormControl, InputAdornment, Link, MenuItem, Table, TableBody, TableCell,
  TableHead, TableRow, TextField, Typography,
} from "@mui/material"
import { SxProps } from "@mui/system"
import React, { useState } from "react"
import { useFieldArray, useFormContext, useWatch, Controller } from "react-hook-form"

import HelpChip from "@/components/EditProject/HelpChip"
import OurFormLabel from "@/components/EditProject/OurFormLabel"
import SectionHeader from "@/components/EditProject/SectionHeader"
import type { PersonInfo, ProjectInfo, DmpFormValues } from "@/dmp"
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

// ============================================================
// DuplicatePersonDialog
// Shows when a KAKEN member already exists in personInfos
// ============================================================

interface DuplicateEntry {
  kakenPerson: PersonInfo
  existingIndex: number
}

interface DuplicatePersonDialogProps {
  open: boolean
  entries: DuplicateEntry[]
  existingPersonInfos: DmpFormValues["dmp"]["personInfo"]
  onSkipAll: () => void
  onClose: () => void
}

function DuplicatePersonDialog({
  open,
  entries,
  existingPersonInfos,
  onSkipAll,
  onClose,
}: DuplicatePersonDialogProps) {
  return (
    <Dialog open={open} onClose={onClose} fullWidth maxWidth="md" closeAfterTransition={false}>
      <DialogTitle sx={{ mt: "0.5rem", mx: "1rem" }}>
        同名の担当者が存在します
      </DialogTitle>
      <DialogContent sx={{ mx: "1rem", mt: "0.5rem" }}>
        <Typography sx={{ mb: "1rem" }}>
          KAKEN から取得した以下の担当者はすでに登録されています。担当者情報を確認してください。
        </Typography>
        <Table size="small">
          <TableHead>
            <TableRow>
              <TableCell sx={{ fontWeight: "bold" }}>項目</TableCell>
              <TableCell sx={{ fontWeight: "bold" }}>既存の情報</TableCell>
              <TableCell sx={{ fontWeight: "bold" }}>KAKEN の情報</TableCell>
            </TableRow>
          </TableHead>
          <TableBody>
            {entries.map(({ kakenPerson, existingIndex }, i) => {
              const existing = existingPersonInfos[existingIndex]
              return (
                <React.Fragment key={i}>
                  <TableRow>
                    <TableCell colSpan={3} sx={{ fontWeight: "bold", backgroundColor: "grey.100" }}>
                      {`${kakenPerson.lastName} ${kakenPerson.firstName}`}
                    </TableCell>
                  </TableRow>
                  <TableRow>
                    <TableCell>役割</TableCell>
                    <TableCell>{existing?.role.join(", ")}</TableCell>
                    <TableCell>{kakenPerson.role.join(", ")}</TableCell>
                  </TableRow>
                  <TableRow>
                    <TableCell>所属機関</TableCell>
                    <TableCell>{existing?.affiliation}</TableCell>
                    <TableCell>{kakenPerson.affiliation}</TableCell>
                  </TableRow>
                  <TableRow>
                    <TableCell>e-Rad 研究者番号</TableCell>
                    <TableCell>{existing?.eRadResearcherId ?? ""}</TableCell>
                    <TableCell>{kakenPerson.eRadResearcherId ?? ""}</TableCell>
                  </TableRow>
                </React.Fragment>
              )
            })}
          </TableBody>
        </Table>
      </DialogContent>
      <DialogActions sx={{ m: "0.5rem 1.5rem 1.5rem" }}>
        <Button variant="contained" color="secondary" onClick={onSkipAll}>
          スキップして閉じる
        </Button>
        <Button variant="outlined" color="secondary" onClick={onClose}>
          キャンセル
        </Button>
      </DialogActions>
    </Dialog>
  )
}

// ============================================================
// KakenSearchPanel
// ============================================================

function KakenSearchPanel() {
  const { setValue } = useFormContext<DmpFormValues>()
  const { append } = useFieldArray<DmpFormValues, "dmp.personInfo">({
    name: "dmp.personInfo",
  })
  const personInfos = useWatch<DmpFormValues>({
    name: "dmp.personInfo",
    defaultValue: [],
  }) as DmpFormValues["dmp"]["personInfo"]

  const [kakenNumber, setKakenNumber] = useState("")
  const { refetch, isFetching } = useKakenProject(kakenNumber)
  const { showSnackbar } = useSnackbar()

  // Duplicate dialog state
  const [duplicateEntries, setDuplicateEntries] = useState<DuplicateEntry[]>([])
  const [pendingPersonInfos, setPendingPersonInfos] = useState<PersonInfo[]>([])
  const [duplicateDialogOpen, setDuplicateDialogOpen] = useState(false)

  const handleSearch = async () => {
    if (!kakenNumber.trim()) return
    const result = await refetch()
    if (result.isSuccess && result.data) {
      const { projectInfo: info, personInfos: kakenPersons } = result.data

      // Fill project info fields
      setValue("dmp.projectInfo.fundingAgency", info.fundingAgency)
      setValue("dmp.projectInfo.programName", info.programName)
      setValue("dmp.projectInfo.programCode", info.programCode)
      setValue("dmp.projectInfo.projectCode", info.projectCode)
      setValue("dmp.projectInfo.projectName", info.projectName)
      setValue("dmp.projectInfo.adoptionYear", info.adoptionYear)
      setValue("dmp.projectInfo.startYear", info.startYear)
      setValue("dmp.projectInfo.endYear", info.endYear)

      // Process KAKEN members
      if (kakenPersons.length > 0) {
        const duplicates: DuplicateEntry[] = []
        const toAppend: PersonInfo[] = []

        for (const kp of kakenPersons) {
          const existingIndex = personInfos.findIndex(
            (p) => p.lastName === kp.lastName && p.firstName === kp.firstName,
          )
          if (existingIndex >= 0) {
            duplicates.push({ kakenPerson: kp, existingIndex })
          } else {
            toAppend.push(kp)
          }
        }

        // Append non-duplicate persons immediately
        for (const p of toAppend) {
          append(p)
        }

        if (duplicates.length > 0) {
          setPendingPersonInfos(toAppend)
          setDuplicateEntries(duplicates)
          setDuplicateDialogOpen(true)
        } else {
          showSnackbar(`${toAppend.length} 名の担当者を追加しました`, "success")
        }
      } else {
        showSnackbar("プロジェクト情報を自動補完しました", "success")
      }
    } else if (result.isSuccess && result.data === null) {
      showSnackbar("KAKEN番号に該当するプロジェクトが見つかりませんでした", "warning")
    } else if (result.isError) {
      showSnackbar("情報の取得に失敗しました", "error")
    }
  }

  const handleDuplicateSkipAll = () => {
    setDuplicateDialogOpen(false)
    setDuplicateEntries([])
    const added = pendingPersonInfos.length
    showSnackbar(
      added > 0
        ? `${added} 名の担当者を追加しました（重複 ${duplicateEntries.length} 名はスキップしました）`
        : `重複する担当者 ${duplicateEntries.length} 名をスキップしました`,
      "info",
    )
  }

  const handleDuplicateClose = () => {
    setDuplicateDialogOpen(false)
    setDuplicateEntries([])
  }

  return (
    <>
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

      <DuplicatePersonDialog
        open={duplicateDialogOpen}
        entries={duplicateEntries}
        existingPersonInfos={personInfos}
        onSkipAll={handleDuplicateSkipAll}
        onClose={handleDuplicateClose}
      />
    </>
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
