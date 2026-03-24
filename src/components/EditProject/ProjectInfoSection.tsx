import SearchIcon from "@mui/icons-material/Search"
import {
  Box, Button, CircularProgress, Dialog, DialogActions, DialogContent, DialogTitle,
  FormControl, InputAdornment, Link, MenuItem, Table, TableBody, TableCell,
  TableHead, TableRow, TextField, Typography,
} from "@mui/material"
import { SxProps } from "@mui/system"
import React, { useState } from "react"
import { useFieldArray, useFormContext, useWatch, Controller } from "react-hook-form"
import { useTranslation } from "react-i18next"

import HelpChip from "@/components/EditProject/HelpChip"
import OurFormLabel from "@/components/EditProject/OurFormLabel"
import SectionHeader from "@/components/EditProject/SectionHeader"
import type { PersonInfo, ProjectInfo, DmpFormValues } from "@/dmp"
import { useKakenProject } from "@/hooks/useKakenProject"
import type { KakenSearchResult } from "@/hooks/useKakenProject"
import { useSnackbar } from "@/hooks/useSnackbar"

interface FormDataConfig {
  key: keyof ProjectInfo
  labelKey: string
  required: boolean
  width: string
  helperText?: string
  type: "text" | "date" | "select"
  options?: string[]
  helpChipKey?: "programName" | "programCode"
}

const formDataConfig: FormDataConfig[] = [
  { key: "fundingAgency", labelKey: "projectInfo.fields.fundingAgency", required: true, width: "480px", type: "text" },
  { key: "programName", labelKey: "projectInfo.fields.programName", required: false, width: "480px", type: "text", helpChipKey: "programName" },
  { key: "programCode", labelKey: "projectInfo.fields.programCode", required: false, width: "480px", type: "text", helpChipKey: "programCode" },
  { key: "projectCode", labelKey: "projectInfo.fields.projectCode", required: true, width: "480px", type: "text" },
  { key: "projectName", labelKey: "projectInfo.fields.projectName", required: true, width: "480px", type: "text" },
  { key: "adoptionYear", labelKey: "projectInfo.fields.adoptionYear", required: false, width: "480px", type: "text" },
  { key: "startYear", labelKey: "projectInfo.fields.startYear", required: false, width: "480px", type: "text" },
  { key: "endYear", labelKey: "projectInfo.fields.endYear", required: false, width: "480px", type: "text" },
]

const NISTEP_URL = "https://www.nistep.go.jp/taikei"

interface ProjectInfoSectionProps {
  sx?: SxProps
}

// ============================================================
// KakenConfirmDialog
// Shows search result and asks user to confirm before auto-filling
// ============================================================

export interface KakenConfirmDialogProps {
  open: boolean
  kakenNumber: string
  result: KakenSearchResult
  onConfirm: () => void
  onCancel: () => void
}

export function KakenConfirmDialog({
  open,
  kakenNumber,
  result,
  onConfirm,
  onCancel,
}: KakenConfirmDialogProps) {
  const { t } = useTranslation("editProject")
  const { projectInfo, personInfos } = result

  return (
    <Dialog open={open} onClose={onCancel} fullWidth maxWidth="sm" closeAfterTransition={false}>
      <DialogTitle sx={{ mt: "0.5rem", mx: "1rem" }}>
        {t("projectInfo.kakenSearch.confirmDialog.title")}
      </DialogTitle>
      <DialogContent sx={{ mx: "1rem", mt: "0.5rem" }}>
        <Table size="small">
          <TableBody>
            <TableRow>
              <TableCell sx={{ fontWeight: "bold", width: "40%" }}>
                {t("projectInfo.kakenSearch.confirmDialog.kakenNumber")}
              </TableCell>
              <TableCell>{kakenNumber}</TableCell>
            </TableRow>
            <TableRow>
              <TableCell sx={{ fontWeight: "bold" }}>
                {t("projectInfo.kakenSearch.confirmDialog.programName")}
              </TableCell>
              <TableCell>{projectInfo.programName ?? ""}</TableCell>
            </TableRow>
            <TableRow>
              <TableCell sx={{ fontWeight: "bold" }}>
                {t("projectInfo.kakenSearch.confirmDialog.projectName")}
              </TableCell>
              <TableCell>{projectInfo.projectName ?? ""}</TableCell>
            </TableRow>
            <TableRow>
              <TableCell sx={{ fontWeight: "bold" }}>
                {t("projectInfo.kakenSearch.confirmDialog.adoptionYear")}
              </TableCell>
              <TableCell>{projectInfo.adoptionYear ?? ""}</TableCell>
            </TableRow>
            <TableRow>
              <TableCell sx={{ fontWeight: "bold", verticalAlign: "top" }}>
                {t("projectInfo.kakenSearch.confirmDialog.persons")}
              </TableCell>
              <TableCell>
                {personInfos.length === 0 ? (
                  <Typography variant="body2" color="text.secondary">
                    {t("projectInfo.kakenSearch.confirmDialog.noPersons")}
                  </Typography>
                ) : (
                  <Box sx={{ display: "flex", flexDirection: "column", gap: "0.25rem" }}>
                    {personInfos.map((p, i) => (
                      <Typography key={i} variant="body2">
                        {`${p.lastName} ${p.firstName}`}
                        {p.role.length > 0 && (
                          <Typography component="span" variant="body2" color="text.secondary" sx={{ ml: 1 }}>
                            {`(${p.role.map((r) => t(`enums.personRole.${r}`)).join(", ")})`}
                          </Typography>
                        )}
                      </Typography>
                    ))}
                  </Box>
                )}
              </TableCell>
            </TableRow>
          </TableBody>
        </Table>
      </DialogContent>
      <DialogActions sx={{ m: "0.5rem 1.5rem 1.5rem" }}>
        <Button variant="contained" color="secondary" onClick={onConfirm}>
          {t("projectInfo.kakenSearch.confirmDialog.yes")}
        </Button>
        <Button variant="outlined" color="secondary" onClick={onCancel}>
          {t("projectInfo.kakenSearch.confirmDialog.no")}
        </Button>
      </DialogActions>
    </Dialog>
  )
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
  const { t } = useTranslation("editProject")
  return (
    <Dialog open={open} onClose={onClose} fullWidth maxWidth="md" closeAfterTransition={false}>
      <DialogTitle sx={{ mt: "0.5rem", mx: "1rem" }}>
        {t("projectInfo.duplicateDialog.title")}
      </DialogTitle>
      <DialogContent sx={{ mx: "1rem", mt: "0.5rem" }}>
        <Typography sx={{ mb: "1rem" }}>
          {t("projectInfo.duplicateDialog.description")}
        </Typography>
        <Table size="small">
          <TableHead>
            <TableRow>
              <TableCell sx={{ fontWeight: "bold" }}>{t("projectInfo.duplicateDialog.colItem")}</TableCell>
              <TableCell sx={{ fontWeight: "bold" }}>{t("projectInfo.duplicateDialog.colExisting")}</TableCell>
              <TableCell sx={{ fontWeight: "bold" }}>{t("projectInfo.duplicateDialog.colKaken")}</TableCell>
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
                    <TableCell>{t("projectInfo.duplicateDialog.rowRole")}</TableCell>
                    <TableCell>{existing?.role.join(", ")}</TableCell>
                    <TableCell>{kakenPerson.role.join(", ")}</TableCell>
                  </TableRow>
                  <TableRow>
                    <TableCell>{t("projectInfo.duplicateDialog.rowAffiliation")}</TableCell>
                    <TableCell>{existing?.affiliation}</TableCell>
                    <TableCell>{kakenPerson.affiliation}</TableCell>
                  </TableRow>
                  <TableRow>
                    <TableCell>{t("projectInfo.duplicateDialog.rowERadId")}</TableCell>
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
          {t("projectInfo.duplicateDialog.skipAll")}
        </Button>
        <Button variant="outlined" color="secondary" onClick={onClose}>
          {t("projectInfo.duplicateDialog.cancel")}
        </Button>
      </DialogActions>
    </Dialog>
  )
}

// ============================================================
// KakenSearchPanel
// ============================================================

function KakenSearchPanel() {
  const { t } = useTranslation("editProject")
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

  // Confirm dialog state
  const [pendingKakenResult, setPendingKakenResult] = useState<KakenSearchResult | null>(null)
  const [confirmDialogOpen, setConfirmDialogOpen] = useState(false)

  // Duplicate dialog state
  const [duplicateEntries, setDuplicateEntries] = useState<DuplicateEntry[]>([])
  const [pendingPersonInfos, setPendingPersonInfos] = useState<PersonInfo[]>([])
  const [duplicateDialogOpen, setDuplicateDialogOpen] = useState(false)

  const handleSearch = async () => {
    if (!kakenNumber.trim()) return
    const result = await refetch()
    if (result.isSuccess && result.data) {
      setPendingKakenResult(result.data)
      setConfirmDialogOpen(true)
    } else if (result.isSuccess && result.data === null) {
      showSnackbar(t("projectInfo.kakenSearch.notFound"), "warning")
    } else if (result.isError) {
      showSnackbar(t("projectInfo.kakenSearch.fetchFailed"), "error")
    }
  }

  const handleConfirmApply = () => {
    if (!pendingKakenResult) return
    const { projectInfo: info, personInfos: kakenPersons } = pendingKakenResult

    setConfirmDialogOpen(false)
    setPendingKakenResult(null)

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
        showSnackbar(t("projectInfo.kakenSearch.addedPersons", { count: toAppend.length }), "success")
      }
    } else {
      showSnackbar(t("projectInfo.kakenSearch.autocompleted"), "success")
    }
  }

  const handleConfirmCancel = () => {
    setConfirmDialogOpen(false)
    setPendingKakenResult(null)
  }

  const handleDuplicateSkipAll = () => {
    setDuplicateDialogOpen(false)
    setDuplicateEntries([])
    const added = pendingPersonInfos.length
    showSnackbar(
      added > 0
        ? t("projectInfo.kakenSearch.addedPersonsWithSkip", { count: added, skip: duplicateEntries.length })
        : t("projectInfo.kakenSearch.skippedPersons", { count: duplicateEntries.length }),
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
            label={t("projectInfo.kakenSearch.label")}
            placeholder={t("projectInfo.kakenSearch.placeholder")}
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
            {isFetching ? t("projectInfo.kakenSearch.searching") : t("projectInfo.kakenSearch.search")}
          </Button>
        </Box>
      </Box>

      {pendingKakenResult && (
        <KakenConfirmDialog
          open={confirmDialogOpen}
          kakenNumber={kakenNumber}
          result={pendingKakenResult}
          onConfirm={handleConfirmApply}
          onCancel={handleConfirmCancel}
        />
      )}

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
  const { t } = useTranslation("editProject")
  const { control } = useFormContext<DmpFormValues>()

  const buildHelpChip = (helpChipKey: "programName" | "programCode") => (
    <>
      {t(`projectInfo.helpChip.${helpChipKey}Part1`)}
      <Link href={NISTEP_URL} target="_blank" rel="noopener noreferrer" children={NISTEP_URL} />
      {t(`projectInfo.helpChip.${helpChipKey}Part2`)}
    </>
  )

  return (
    <Box sx={{ ...sx, display: "flex", flexDirection: "column" }}>
      <SectionHeader text={t("projectInfo.sectionTitle")} />
      <Box sx={{ display: "flex", flexDirection: "column", gap: "1rem", mt: "1rem" }}>
        <KakenSearchPanel />
        {formDataConfig.map(({ key, labelKey, required, width, helperText, type, options, helpChipKey }) => {
          const label = t(labelKey)
          return (
            <Controller
              key={key}
              name={`dmp.projectInfo.${key}`}
              control={control}
              rules={required ? { required: t("projectInfo.validation.required", { label }) } : {}}
              render={({ field, fieldState: { error } }) => (
                <FormControl fullWidth>
                  <Box sx={{ display: "flex", flexDirection: "row", alignItems: "center" }}>
                    <OurFormLabel label={label} required={required} />
                    {helpChipKey && <HelpChip text={buildHelpChip(helpChipKey)} />}
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
          )
        })}
      </Box>
    </Box>
  )
}
