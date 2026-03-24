import type { GrdmFileItem , GrdmFileMetadataSchema } from "@hirakinii-packages/grdm-api-typescript"
import AddLinkOutlined from "@mui/icons-material/AddLinkOutlined"
import AddOutlined from "@mui/icons-material/AddOutlined"
import ArrowDownwardOutlined from "@mui/icons-material/ArrowDownwardOutlined"
import ArrowUpwardOutlined from "@mui/icons-material/ArrowUpwardOutlined"
import CloudDownloadOutlined from "@mui/icons-material/CloudDownloadOutlined"
import DeleteOutline from "@mui/icons-material/DeleteOutline"
import EditOutlined from "@mui/icons-material/EditOutlined"
import ExpandLessOutlined from "@mui/icons-material/ExpandLessOutlined"
import LinkOffOutlined from "@mui/icons-material/LinkOffOutlined"
import OpenInNew from "@mui/icons-material/OpenInNew"
import {
  Autocomplete,
  Box,
  Button,
  Checkbox,
  Chip,
  CircularProgress,
  Collapse,
  colors,
  Dialog,
  DialogActions,
  DialogContent,
  DialogTitle,
  FormControl,
  FormHelperText,
  Link,
  MenuItem,
  Paper,
  Select,
  Table,
  TableBody,
  TableCell,
  TableContainer,
  TableHead,
  TableRow,
  TextField,
  Typography,
} from "@mui/material"
import { SxProps } from "@mui/system"
import React, { useEffect, useState } from "react"
import {
  Controller,
  FormProvider,
  useFieldArray,
  useForm,
  useFormContext,
  useFormState,
  useWatch,
} from "react-hook-form"
import { useTranslation } from "react-i18next"

import HelpChip from "@/components/EditProject/HelpChip"
import OurFormLabel from "@/components/EditProject/OurFormLabel"
import SectionHeader from "@/components/EditProject/SectionHeader"
import { accessRights, dataType, hasSensitiveData, initDataInfo, researchField } from "@/dmp"
import type { DataInfo, DataInfoSource, DmpFormValues, ResearchPhase, ValueSource } from "@/dmp"
import { formatDateToTimezone, ProjectInfo } from "@/grdmClient"
import { useGrdmFileItemMetadata } from "@/hooks/useGrdmFileItemMetadata"
import type { RorOrganization } from "@/hooks/useRorSearch"
import { useRorSearch } from "@/hooks/useRorSearch"
import { useSnackbar } from "@/hooks/useSnackbar"
import { User } from "@/hooks/useUser"
import theme from "@/theme"

// ============================================================
// Types
// ============================================================

interface FormData {
  key: keyof DataInfo
  labelKey: string
  required: boolean
  placeholderKey?: string
  helperText?: string
  type: "text" | "date" | "select"
  options?: string[]
  selectMultiple?: boolean
  helpChipKey?: string
  minRows?: number
}

// ============================================================
// Field configuration
// ============================================================

const formData: FormData[] = [
  { key: "dataName", labelKey: "dataInfo.fields.dataName", required: true, type: "text", placeholderKey: "dataInfo.placeholders.dataName", helpChipKey: "dataName" },
  { key: "publicationDate", labelKey: "dataInfo.fields.publicationDate", required: false, type: "date" },
  { key: "description", labelKey: "dataInfo.fields.description", required: true, type: "text", placeholderKey: "dataInfo.placeholders.description", helpChipKey: "description", minRows: 3 },
  { key: "acquisitionMethod", labelKey: "dataInfo.fields.acquisitionMethod", required: false, type: "text", placeholderKey: "dataInfo.placeholders.acquisitionMethod", helpChipKey: "acquisitionMethod", minRows: 3 },
  { key: "researchField", labelKey: "dataInfo.fields.researchField", required: true, type: "select", options: [...researchField] },
  { key: "dataType", labelKey: "dataInfo.fields.dataType", required: true, type: "select", options: [...dataType] },
  { key: "dataSize", labelKey: "dataInfo.fields.dataSize", required: false, type: "text", placeholderKey: "dataInfo.placeholders.dataSize", helpChipKey: "dataSize" },
  { key: "reuseInformation", labelKey: "dataInfo.fields.reuseInformation", required: false, type: "text", placeholderKey: "dataInfo.placeholders.reuseInformation", helpChipKey: "reuseInformation", minRows: 3 },
  { key: "hasSensitiveData", labelKey: "dataInfo.fields.hasSensitiveData", required: false, type: "select", options: ["", ...hasSensitiveData] },
  { key: "sensitiveDataPolicy", labelKey: "dataInfo.fields.sensitiveDataPolicy", required: false, type: "text", placeholderKey: "dataInfo.placeholders.sensitiveDataPolicy", helpChipKey: "sensitiveDataPolicy", minRows: 3 },
  { key: "usagePolicy", labelKey: "dataInfo.fields.usagePolicy", required: true, type: "text", placeholderKey: "dataInfo.placeholders.usagePolicy", helpChipKey: "usagePolicy", minRows: 3 },
  { key: "repositoryInformation", labelKey: "dataInfo.fields.repositoryInformation", required: true, type: "text", placeholderKey: "dataInfo.placeholders.repositoryInformation", helpChipKey: "repositoryInformation", minRows: 3 },
  { key: "backupLocation", labelKey: "dataInfo.fields.backupLocation", required: false, type: "text", placeholderKey: "dataInfo.placeholders.backupLocation", helpChipKey: "backupLocation", minRows: 3 },
  { key: "publicationPolicy", labelKey: "dataInfo.fields.publicationPolicy", required: false, type: "text", placeholderKey: "dataInfo.placeholders.publicationPolicy", helpChipKey: "publicationPolicy", minRows: 3 },
  { key: "accessRights", labelKey: "dataInfo.fields.accessRights", required: true, type: "select", options: [...accessRights] },
  { key: "plannedPublicationDate", labelKey: "dataInfo.fields.plannedPublicationDate", required: false, type: "date" },
  { key: "repository", labelKey: "dataInfo.fields.repository", required: false, type: "text", placeholderKey: "dataInfo.placeholders.repository", helpChipKey: "repository" },
  { key: "dataCreator", labelKey: "dataInfo.fields.dataCreator", required: false, type: "select", options: [] },
  { key: "dataManagementAgency", labelKey: "dataInfo.fields.dataManagementAgency", required: true, type: "text", placeholderKey: "dataInfo.placeholders.dataManagementAgency" },
  { key: "rorId", labelKey: "dataInfo.fields.rorId", required: false, type: "text", placeholderKey: "dataInfo.placeholders.rorId", helpChipKey: "rorId" },
  { key: "dataManager", labelKey: "dataInfo.fields.dataManager", required: true, type: "text", placeholderKey: "dataInfo.placeholders.dataManager", helpChipKey: "dataManager" },
  { key: "dataManagerContact", labelKey: "dataInfo.fields.dataManagerContact", required: true, type: "text", placeholderKey: "dataInfo.placeholders.dataManagerContact", helpChipKey: "dataManagerContact" },
  { key: "dataStorageLocation", labelKey: "dataInfo.fields.dataStorageLocation", required: false, type: "text", placeholderKey: "dataInfo.placeholders.dataStorageLocation" },
  { key: "dataStoragePeriod", labelKey: "dataInfo.fields.dataStoragePeriod", required: false, type: "text", placeholderKey: "dataInfo.placeholders.dataStoragePeriod" },
]

// ============================================================
// GRDM field mapping
// ============================================================

interface GrdmFieldMapping {
  dataInfoKey: keyof DataInfo
  grdmKey: keyof GrdmFileMetadataSchema
  labelKey: string
}

const GRDM_FIELD_MAP: GrdmFieldMapping[] = [
  { dataInfoKey: "dataName", grdmKey: "grdm-file:title-ja", labelKey: "dataInfo.fields.dataName" },
  { dataInfoKey: "publicationDate", grdmKey: "grdm-file:date-issued-updated", labelKey: "dataInfo.fields.publicationDate" },
  { dataInfoKey: "description", grdmKey: "grdm-file:data-description-ja", labelKey: "dataInfo.fields.description" },
  { dataInfoKey: "researchField", grdmKey: "grdm-file:data-research-field", labelKey: "dataInfo.fields.researchField" },
  { dataInfoKey: "dataType", grdmKey: "grdm-file:data-type", labelKey: "dataInfo.fields.dataType" },
  { dataInfoKey: "dataSize", grdmKey: "grdm-file:file-size", labelKey: "dataInfo.fields.dataSize" },
  { dataInfoKey: "accessRights", grdmKey: "grdm-file:access-rights", labelKey: "dataInfo.fields.accessRights" },
  { dataInfoKey: "plannedPublicationDate", grdmKey: "grdm-file:available-date", labelKey: "dataInfo.fields.plannedPublicationDate" },
  { dataInfoKey: "repositoryInformation", grdmKey: "grdm-file:repo-information-ja", labelKey: "dataInfo.fields.repositoryInformation" },
  { dataInfoKey: "repository", grdmKey: "grdm-file:repo-url-doi-link", labelKey: "dataInfo.fields.repository" },
  { dataInfoKey: "dataManagementAgency", grdmKey: "grdm-file:hosting-inst-ja", labelKey: "dataInfo.fields.dataManagementAgency" },
  { dataInfoKey: "rorId", grdmKey: "grdm-file:hosting-inst-id", labelKey: "dataInfo.fields.rorId" },
  { dataInfoKey: "dataManager", grdmKey: "grdm-file:data-man-name-ja", labelKey: "dataInfo.fields.dataManager" },
  { dataInfoKey: "dataManagerContact", grdmKey: "grdm-file:data-man-email", labelKey: "dataInfo.fields.dataManagerContact" },
]

const getGrdmFieldValue = (fileItem: GrdmFileItem, grdmKey: keyof GrdmFileMetadataSchema): string | null => {
  const activeSchema = fileItem.items.find((s) => s.active)
  if (!activeSchema) return null
  const field = activeSchema[grdmKey] as { value?: unknown } | undefined
  if (!field?.value) return null
  return String(field.value)
}

// ============================================================
// byteSizeToHumanReadable helper
// ============================================================

const byteSizeToHumanReadable = (size?: number | null, decimals = 2): string => {
  if (typeof size !== "number" || !isFinite(size) || size < 0) return "N/A"

  const units = ["B", "KB", "MB", "GB", "TB", "PB", "EB"]
  let i = 0
  let readableSize = size

  while (readableSize >= 1024 && i < units.length - 1) {
    readableSize /= 1024
    i++
  }

  return `${readableSize.toFixed(i === 0 ? 0 : decimals)} ${units[i]}`
}

// ============================================================
// SourceBadge — shows the origin of a field value
// ============================================================

function SourceBadge({ source }: { source?: ValueSource }) {
  const { t } = useTranslation("editProject")
  if (!source) return null
  const labels: Record<ValueSource, string> = {
    grdm: t("dataInfo.sourceBadge.grdm"),
    manual: t("dataInfo.sourceBadge.manual"),
    kaken: "KAKEN",
  }
  const chipColors: Record<ValueSource, "success" | "default" | "info"> = {
    grdm: "success",
    manual: "default",
    kaken: "info",
  }
  return (
    <Chip
      label={labels[source]}
      color={chipColors[source]}
      size="small"
      sx={{ ml: 0.5, fontSize: "0.65rem", height: "18px" }}
    />
  )
}

// ============================================================
// DataManagementAgencyField — Autocomplete with ROR search
// ============================================================

interface DataManagementAgencyFieldProps {
  label: string
  required: boolean
  helpChip?: React.ReactNode
  source?: ValueSource
  onSourceChange: (source: ValueSource) => void
}

function DataManagementAgencyField({ label, required, helpChip, source, onSourceChange }: DataManagementAgencyFieldProps) {
  const { t } = useTranslation("editProject")
  const { control, setValue } = useFormContext<DataInfo>()
  const [searchQuery, setSearchQuery] = useState("")
  const { results, isLoading, isError } = useRorSearch(searchQuery)
  const { showSnackbar } = useSnackbar()

  useEffect(() => {
    if (isError) showSnackbar(t("dataInfo.rorSearch.fetchFailed"), "error")
  }, [isError, showSnackbar, t])

  return (
    <Controller
      name="dataManagementAgency"
      control={control}
      rules={required ? { required: `${label} は必須です` } : {}}
      render={({ field, fieldState: { error } }) => (
        <FormControl fullWidth>
          <Box sx={{ display: "flex", flexDirection: "row", alignItems: "center" }}>
            <OurFormLabel label={label} required={required} />
            {helpChip && <HelpChip text={helpChip} />}
            <SourceBadge source={source} />
          </Box>
          <Autocomplete<RorOrganization, false, false, true>
            freeSolo
            filterOptions={(x) => x}
            options={results}
            getOptionLabel={(option) => typeof option === "string" ? option : (option.name ?? "")}
            inputValue={field.value ?? ""}
            onInputChange={(_, newValue, reason) => {
              field.onChange(newValue)
              if (reason === "input" || reason === "clear") {
                setSearchQuery(newValue)
              }
              if (reason === "input") {
                onSourceChange("manual")
              }
            }}
            onChange={(_, newValue) => {
              if (newValue !== null && typeof newValue !== "string") {
                field.onChange(newValue.name)
                setValue("rorId", newValue.id, { shouldDirty: true })
              } else if (newValue === null) {
                setValue("rorId", undefined, { shouldDirty: true })
              }
            }}
            loading={isLoading}
            loadingText={t("dataInfo.rorSearch.loading")}
            noOptionsText={searchQuery.length >= 2 ? t("dataInfo.rorSearch.noOptions") : t("dataInfo.rorSearch.typeMoreChars")}
            size="small"
            renderOption={(props, option) => (
              <li {...props} key={option.id}>
                <Box sx={{ display: "flex", flexDirection: "column" }}>
                  <Typography variant="body2">{option.name}</Typography>
                  <Typography variant="caption" color="text.secondary">{option.id}</Typography>
                </Box>
              </li>
            )}
            renderInput={(params) => (
              <TextField
                {...params}
                inputRef={field.ref}
                error={!!error}
                helperText={error?.message}
                placeholder={t("dataInfo.placeholders.dataManagementAgency")}
                size="small"
                slotProps={{
                  input: {
                    ...params.InputProps,
                    endAdornment: (
                      <>
                        {isLoading ? <CircularProgress size={16} color="inherit" /> : null}
                        {params.InputProps.endAdornment}
                      </>
                    ),
                  },
                }}
              />
            )}
          />
        </FormControl>
      )}
    />
  )
}

// ============================================================
// GrdmCompareModal — compare current values vs GRDM metadata
// ============================================================

interface GrdmCompareModalProps {
  open: boolean
  onClose: () => void
  fileItem: GrdmFileItem
  getCurrentValue: (key: keyof DataInfo) => string
  onApply: (keys: (keyof DataInfo)[], values: Partial<DataInfo>) => void
}

function GrdmCompareModal({ open, onClose, fileItem, getCurrentValue, onApply }: GrdmCompareModalProps) {
  const { t } = useTranslation("editProject")
  const mappedFields = GRDM_FIELD_MAP.map((m) => ({
    ...m,
    label: t(m.labelKey),
    currentValue: getCurrentValue(m.dataInfoKey),
    grdmValue: getGrdmFieldValue(fileItem, m.grdmKey),
  })).filter((f) => f.grdmValue !== null)

  const [selectedKeys, setSelectedKeys] = useState<Set<keyof DataInfo>>(new Set())

  const toggleKey = (key: keyof DataInfo) => {
    setSelectedKeys((prev) => {
      const next = new Set(prev)
      if (next.has(key)) {
        next.delete(key)
      } else {
        next.add(key)
      }
      return next
    })
  }

  const buildValues = (keys: (keyof DataInfo)[]): Partial<DataInfo> => {
    const values: Partial<DataInfo> = {}
    for (const { dataInfoKey, grdmValue } of mappedFields) {
      if (keys.includes(dataInfoKey) && grdmValue !== null) {
        (values as Record<string, unknown>)[dataInfoKey] = grdmValue
      }
    }
    return values
  }

  const handleApplySelected = () => {
    const keys = Array.from(selectedKeys)
    onApply(keys, buildValues(keys))
    onClose()
  }

  const handleApplyAll = () => {
    const keys = mappedFields.map((f) => f.dataInfoKey)
    onApply(keys, buildValues(keys))
    onClose()
  }

  return (
    <Dialog open={open} onClose={onClose} fullWidth maxWidth="lg" closeAfterTransition={false}>
      <DialogTitle sx={{ mt: "0.5rem", mx: "1rem" }}>
        {t("dataInfo.grdmCompare.title")}
      </DialogTitle>
      <DialogContent sx={{ mx: "1rem" }}>
        <Typography variant="body2" sx={{ mb: "1rem", color: "text.secondary" }}>
          {t("dataInfo.grdmCompare.description")}
        </Typography>
        <TableContainer component={Paper} variant="outlined" sx={{ borderBottom: "none" }}>
          <Table size="small">
            <TableHead sx={{ backgroundColor: colors.grey[100] }}>
              <TableRow>
                <TableCell sx={{ fontWeight: "bold", width: "20%" }}>{t("dataInfo.grdmCompare.colItem")}</TableCell>
                <TableCell sx={{ fontWeight: "bold", width: "35%" }}>{t("dataInfo.grdmCompare.colCurrent")}</TableCell>
                <TableCell sx={{ fontWeight: "bold", width: "35%" }}>{t("dataInfo.grdmCompare.colGrdm")}</TableCell>
                <TableCell sx={{ fontWeight: "bold", width: "10%", textAlign: "center" }}>{t("dataInfo.grdmCompare.colAdopt")}</TableCell>
              </TableRow>
            </TableHead>
            <TableBody>
              {mappedFields.map(({ dataInfoKey, label, currentValue, grdmValue }) => (
                <TableRow key={dataInfoKey}>
                  <TableCell sx={{ verticalAlign: "top" }}>{label}</TableCell>
                  <TableCell sx={{ verticalAlign: "top", color: "text.secondary", whiteSpace: "pre-wrap", wordBreak: "break-all" }}>
                    {currentValue || t("dataInfo.grdmCompare.empty")}
                  </TableCell>
                  <TableCell sx={{ verticalAlign: "top", whiteSpace: "pre-wrap", wordBreak: "break-all" }}>
                    {grdmValue}
                  </TableCell>
                  <TableCell sx={{ textAlign: "center", verticalAlign: "top" }}>
                    <Checkbox
                      size="small"
                      checked={selectedKeys.has(dataInfoKey)}
                      onChange={() => toggleKey(dataInfoKey)}
                    />
                  </TableCell>
                </TableRow>
              ))}
            </TableBody>
          </Table>
        </TableContainer>
      </DialogContent>
      <DialogActions sx={{ m: "0.5rem 1.5rem 1.5rem", gap: "0.5rem", flexWrap: "wrap" }}>
        <Button
          variant="contained"
          color="secondary"
          onClick={handleApplyAll}
          children={t("dataInfo.grdmCompare.applyAll")}
        />
        <Button
          variant="outlined"
          color="secondary"
          onClick={handleApplySelected}
          disabled={selectedKeys.size === 0}
          children={t("dataInfo.grdmCompare.applySelected")}
        />
        <Button
          variant="outlined"
          color="secondary"
          onClick={onClose}
          children={t("dataInfo.grdmCompare.close")}
        />
      </DialogActions>
    </Dialog>
  )
}

// ============================================================
// DataInfoForm — accordion content (edit / add form)
// ============================================================

interface DataInfoFormProps {
  index: number
  totalCount: number
  onSubmit: (data: DataInfo) => void
  onClose: () => void
  researchPhase: ResearchPhase
  personNames: string[]
}

function DataInfoForm({ index, totalCount, onSubmit, onClose, researchPhase, personNames }: DataInfoFormProps) {
  const { t } = useTranslation("editProject")
  const dialogMethods = useForm<DataInfo>({
    defaultValues: initDataInfo(),
    mode: "onBlur",
    reValidateMode: "onBlur",
  })
  const { isValid, isSubmitted } = useFormState({ control: dialogMethods.control })

  // Sync initial values from parent form when the accordion opens
  const dataInfos = useWatch<DmpFormValues>({
    name: "dmp.dataInfo",
    defaultValue: [],
  }) as DmpFormValues["dmp"]["dataInfo"]

  // Reset form with current values when the component mounts
  useState(() => {
    if (index < totalCount) {
      dialogMethods.reset(dataInfos[index] as DataInfo)
    } else {
      dialogMethods.reset(initDataInfo())
    }
  })

  const isAddMode = index === totalCount

  const { showSnackbar } = useSnackbar()

  // GRDM file metadata fetch
  const linkedFiles = dialogMethods.watch("linkedGrdmFiles") ?? []
  const firstLinkedFile = linkedFiles[0] ?? null
  const {
    data: grdmFileItem,
    isFetching: isGrdmFetching,
    refetch: refetchGrdm,
  } = useGrdmFileItemMetadata(firstLinkedFile?.projectId, firstLinkedFile?.materialized_path)

  const [compareOpen, setCompareOpen] = useState(false)

  const handleGrdmFetch = async () => {
    const result = await refetchGrdm()
    if (result.data) {
      setCompareOpen(true)
    } else {
      showSnackbar(t("dataInfo.editForm.fetchGrdmMetaNotFound"), "warning")
    }
  }

  // ---- Value helpers ----

  const getValue = <K extends keyof DataInfo>(key: K): DataInfo[K] => {
    const value = dialogMethods.getValues(key)
    if (value === undefined || value === null) return "" as DataInfo[K]
    if (key === "dataCreator") return (personNames[(value as number) - 1] ?? "") as DataInfo[K]
    return value
  }

  const getDisplayValue = (key: keyof DataInfo): string => {
    const value = getValue(key)
    if (value === undefined || value === null || value === "") return ""
    if (Array.isArray(value)) return (value as unknown[]).map(String).join(", ")
    return String(value)
  }

  const getOptions = <K extends keyof DataInfo>(key: K): string[] => {
    if (key === "dataCreator") return personNames
    return formData.find((item) => item.key === key)?.options ?? []
  }

  const updateValue = <K extends keyof DataInfo>(key: K, value: DataInfo[K]) => {
    let newValue: DataInfo[K] = value
    if (key === "dataCreator") {
      newValue = (personNames.indexOf(value as string) + 1) as DataInfo[K]
    }
    if (newValue === "") {
      newValue = undefined as DataInfo[K]
    }
    dialogMethods.setValue(key, newValue as never, { shouldDirty: true })
    // Track as manually edited
    const currentSource = dialogMethods.getValues("source") ?? {}
    dialogMethods.setValue("source", { ...currentSource, [key]: "manual" } as never)
  }

  const getEffectiveRequired = (key: keyof DataInfo, staticRequired: boolean): boolean => {
    switch (key) {
      case "publicationDate":
        return researchPhase === "研究中" || researchPhase === "報告時"
      case "repository":
      case "plannedPublicationDate":
        return researchPhase === "報告時"
      default:
        return staticRequired
    }
  }

  const getValidationRules = <K extends keyof DataInfo>(key: K, staticRequired: boolean, label: string) => {
    const effectiveRequired = getEffectiveRequired(key, staticRequired)
    if (effectiveRequired) return { required: t("dataInfo.validation.required", { label }) }
    if (key === "plannedPublicationDate") {
      const accessRightsValue = dialogMethods.getValues("accessRights")
      if (accessRightsValue === "公開期間猶予") {
        return { required: t("dataInfo.validation.plannedPublicationDateRequired") }
      }
    }
    return {}
  }

  // ---- GRDM compare apply ----

  const handleGrdmApply = (keys: (keyof DataInfo)[], values: Partial<DataInfo>) => {
    const currentSource: DataInfoSource = dialogMethods.getValues("source") ?? {}
    const newSource: DataInfoSource = { ...currentSource }
    for (const key of keys) {
      const val = (values as Record<string, unknown>)[key as string]
      if (val !== undefined) {
        dialogMethods.setValue(key as never, val as never, { shouldDirty: true })
        ;(newSource as Record<string, unknown>)[key as string] = "grdm"
      }
    }
    dialogMethods.setValue("source", newSource as never)
    dialogMethods.trigger()
  }

  const handleSubmit = (data: DataInfo) => {
    onSubmit(data)
  }

  /** Returns a helpChip ReactNode for a given helpChipKey, or undefined. */
  const buildHelpChip = (helpChipKey: string | undefined): React.ReactNode => {
    if (!helpChipKey) return undefined
    // helpChip content kept in Japanese as per i18n scope (labels only)
    const map: Record<string, React.ReactNode> = {
      dataName: <>{"e.g., ○○の実証における○○撮像データ, ○○シミュレーションデータ"}</>,
      description: <>{"e.g., ○○実証において、○○撮像画像データ。○○ (規格) を利用した撮像データ (日時、気温、天候、センサの設置場所等の詳細情報を含む)"}<br />{"e.g., ○○時の○○の挙動を予想するためシミュレーションによって得られるデータ。"}</>,
      acquisitionMethod: <>{"想定されている関連する標準や方法、品質保証、データの組織化 (命名規則、バージョン管理、フォルダ構造) 等を記述してください。"}<br />{"e.g., センサを設置し、自ら取得, 自らシミュレーションを行い取得"}</>,
      dataSize: <>{"管理対象データの概ねのデータ容量を以下から選択。"}<br />{"e.g.,<1GB, 1-10GB, 10-100GB, >100GB"}<br />{"システムからデータ容量の値を出力できる場合は、データ容量の値そのものをセットしてください。"}</>,
      reuseInformation: <>{"可読性を保証するメタデータ等の情報を記載してください"}</>,
      sensitiveDataPolicy: <>{"データの保存や共有に関する同意、匿名化処理、センシティブデータの扱い等を記述してください。"}<br />{"e.g., 個人情報の取扱いについては、関係法令を遵守する。企業との共同研究契約に基づき研究データを管理する。"}</>,
      usagePolicy: <>{"e.g., △△のデータは取得後随時公開、○○のデータは一定期間経過の後公開"}<br />{"e.g., 企業との共同研究も予定していることから、基本的には非公開とする。公開しても問題ないと研究データ取得者が判断したデータについては、研究事業期間中でも広く一般に向け公開することも可能とする。"}</>,
      repositoryInformation: <>{"e.g., 研究代表者が所属する○○大学 (研究室) のストレージで保存"}<br />{"e.g., 研究中は、各データ取得者が所属する大学 (研究室) のストレージで保存"}</>,
      backupLocation: <>{"e.g., 研究代表者が所属する○○大学 (研究室) のストレージのバックアップサービスによる"}<br />{"e.g., 各データ取得者が所属する大学（研究室)。機関のストレージのバックアップサービスによる"}</>,
      publicationPolicy: <>{"e.g., 取得後随時公開"}<br />{"e.g., ○○のデータは研究事業終了後までは非公開とし、終了後 (論文発表後) に一部公開開始。同研究室内 (同プロジェクトメンバー内) でのみ共有。"}</>,
      repository: <>{"「リポジトリURL・DOIリンク」につきましては、情報がある場合に入力ください。"}<br />{"DOIが付与されている場合はDOIリンク、DOIが付与されていない場合は当該の管理対象データのランディングページのURLをご記入下さい"}<br />{"e.g., ○○大学機関リポジトリ, https://doi.org/10.12345/abcde"}</>,
      rorId: <>{"データ管理機関の Research Organization Registry (ROR) コードがあれば記載して下さい。"}<br />{"e.g., https://ror.org/123456789"}</>,
      dataManager: <>{"データ管理機関において各管理対象データを管理する部署名または担当者の名前を入力してください。"}<br />{"e.g., ××推進部, △△研究室"}</>,
      dataManagerContact: <>{"個人情報保護の観点から、個人ではなく組織の連絡先が望ましいです。"}<br />{"e.g., xxx@xxx, 〇〇県〇〇市××"}</>,
    }
    return map[helpChipKey]
  }

  const getFieldSource = (key: keyof DataInfo): ValueSource | undefined => {
    return dialogMethods.watch("source")?.[key as keyof DataInfoSource] as ValueSource | undefined
  }

  return (
    <FormProvider {...dialogMethods}>
      <Box sx={{ p: "1.5rem", backgroundColor: colors.grey[50], borderTop: `1px solid ${colors.grey[300]}` }}>
        <Typography variant="subtitle1" sx={{ fontWeight: "bold", mb: "1rem" }}>
          {isAddMode ? t("dataInfo.editForm.titleAdd") : t("dataInfo.editForm.titleEdit")}
        </Typography>

        {/* Form fields */}
        <Box sx={{ display: "flex", flexDirection: "column", gap: "1rem" }}>
          {formData.map(({ key, labelKey, required: staticRequired, helperText, placeholderKey, type, selectMultiple, helpChipKey, minRows }) => {
            const label = t(labelKey)
            const effectiveRequired = getEffectiveRequired(key, staticRequired)
            const fieldSource = getFieldSource(key)

            // Special header area for dataName: shows GRDM fetch button alongside
            const isDataNameField = key === "dataName"

            // Render the data management agency field with ROR API autocomplete
            if (key === "dataManagementAgency") {
              return (
                <DataManagementAgencyField
                  key={key}
                  label={label}
                  required={effectiveRequired}
                  helpChip={helpChipKey ? <>{t(`dataInfo.fields.${key}`)}</> : undefined}
                  source={fieldSource}
                  onSourceChange={() => {
                    const currentSource = dialogMethods.getValues("source") ?? {}
                    dialogMethods.setValue("source", { ...currentSource, dataManagementAgency: "manual" } as never)
                  }}
                />
              )
            }

            return (
              <Controller
                key={key}
                name={key}
                control={dialogMethods.control}
                rules={getValidationRules(key, staticRequired, label)}
                render={({ field, fieldState: { error } }) => (
                  <FormControl fullWidth>
                    <Box sx={{ display: "flex", flexDirection: "row", alignItems: "center" }}>
                      <OurFormLabel label={label} required={effectiveRequired} />
                      {buildHelpChip(helpChipKey) && <HelpChip text={buildHelpChip(helpChipKey)!} />}
                      <SourceBadge source={fieldSource} />
                      {isDataNameField && (
                        <Button
                          size="small"
                          variant="outlined"
                          color="info"
                          startIcon={isGrdmFetching ? <CircularProgress size={14} /> : <CloudDownloadOutlined />}
                          onClick={handleGrdmFetch}
                          disabled={!firstLinkedFile || isGrdmFetching}
                          sx={{ ml: "auto", textTransform: "none", whiteSpace: "nowrap" }}
                          children={t("dataInfo.editForm.fetchGrdmMeta")}
                        />
                      )}
                    </Box>
                    {!selectMultiple ? (
                      <TextField
                        {...field}
                        fullWidth
                        variant="outlined"
                        error={!!error}
                        helperText={error?.message ?? (key === "dataCreator" ? t("dataInfo.helperText.dataCreator") : helperText)}
                        placeholder={placeholderKey ? t(placeholderKey) : undefined}
                        value={getValue(key)}
                        onChange={(e) => updateValue(key, e.target.value)}
                        type={type === "date" ? "date" : "text"}
                        select={type === "select"}
                        size="small"
                        multiline={minRows !== undefined && minRows > 1}
                        minRows={minRows}
                      >
                        {type === "select" &&
                          getOptions(key).map((option) => {
                            const enumKey = key === "researchField" ? "researchField"
                              : key === "dataType" ? "dataType"
                                : key === "hasSensitiveData" ? "hasSensitiveData"
                                  : key === "accessRights" ? "accessRights"
                                    : null
                            const displayLabel = enumKey && option
                              ? t(`enums.${enumKey}.${option}`, { defaultValue: option })
                              : option
                            return <MenuItem key={option} value={option} children={displayLabel} />
                          })}
                      </TextField>
                    ) : (
                      <>
                        <Select
                          {...field}
                          value={field.value ?? []}
                          fullWidth
                          variant="outlined"
                          error={!!error}
                          multiple
                          size="small"
                          onChange={(e) => {
                            field.onChange(e)
                            const currentSource = dialogMethods.getValues("source") ?? {}
                            dialogMethods.setValue("source", { ...currentSource, [key]: "manual" } as never)
                          }}
                          renderValue={(selected) => (
                            <Box sx={{ display: "flex", flexDirection: "row", gap: "0.5rem" }}>
                              {(selected as unknown as string[]).map((value) => (
                                <Chip key={value} label={value} />
                              ))}
                            </Box>
                          )}
                        >
                          {getOptions(key).map((option) => (
                            <MenuItem key={option} value={option} children={option} />
                          ))}
                        </Select>
                        <FormHelperText error={!!error} children={error?.message ?? helperText} />
                      </>
                    )}
                  </FormControl>
                )}
              />
            )
          })}
        </Box>

        {/* Actions */}
        <Box sx={{ display: "flex", flexDirection: "row", gap: "1rem", mt: "1.5rem", justifyContent: "flex-start" }}>
          <Button
            type="submit"
            children={isAddMode ? t("dataInfo.editForm.add") : t("dataInfo.editForm.save")}
            variant="contained"
            color="secondary"
            disabled={isSubmitted && !isValid}
            onClick={dialogMethods.handleSubmit(handleSubmit)}
          />
          <Button
            children={t("dataInfo.editForm.cancel")}
            onClick={onClose}
            variant="outlined"
            color="secondary"
            startIcon={<ExpandLessOutlined />}
          />
        </Box>
      </Box>

      {/* GRDM compare modal */}
      {grdmFileItem && compareOpen && (
        <GrdmCompareModal
          open={compareOpen}
          onClose={() => setCompareOpen(false)}
          fileItem={grdmFileItem}
          getCurrentValue={getDisplayValue}
          onApply={handleGrdmApply}
        />
      )}
    </FormProvider>
  )
}

// ============================================================
// DataInfoSectionProps
// ============================================================

interface DataInfoSectionProps {
  sx?: SxProps
  user: User
  projects: ProjectInfo[]
}

// ============================================================
// DataInfoSection — main component
// ============================================================

export default function DataInfoSection({ sx, user, projects }: DataInfoSectionProps) {
  const { t } = useTranslation("editProject")
  const { control } = useFormContext<DmpFormValues>()
  const researchPhase = useWatch({ control, name: "dmp.metadata.researchPhase" }) as ResearchPhase

  const { append, remove, move, update } = useFieldArray<DmpFormValues, "dmp.dataInfo">({
    control,
    name: "dmp.dataInfo",
  })
  const dataInfos = useWatch<DmpFormValues>({
    name: "dmp.dataInfo",
    defaultValue: [],
  }) as DmpFormValues["dmp"]["dataInfo"]

  const personInfo = useWatch({ control, name: "dmp.personInfo" })
  const personNames = personInfo.map((person) => `${person.lastName} ${person.firstName}`.trim())

  const [openIndex, setOpenIndex] = useState<number | null>(null)

  const handleOpen = (index: number) => setOpenIndex(index)
  const handleClose = () => setOpenIndex(null)

  const handleFormSubmit = (data: DataInfo) => {
    if (openIndex === null) return
    if (openIndex === dataInfos.length) {
      append(data)
    } else {
      update(openIndex, data)
    }
    handleClose()
  }

  // Linking Files dialog
  const [linkedGrdmFilesIndex, setLinkedFilesIndex] = useState<number | null>(null)

  const handleUnlinkLinkedFile = (dataInfoIndex: number, nodeId: string) => {
    const dataInfo = dataInfos[dataInfoIndex]
    const newLinkedFiles = dataInfo.linkedGrdmFiles.filter((file) => file.nodeId !== nodeId)
    update(dataInfoIndex, { ...dataInfo, linkedGrdmFiles: newLinkedFiles })
  }

  const renderLinkedFilesContent = () => {
    if (linkedGrdmFilesIndex === null) return null

    const dataInfo = dataInfos[linkedGrdmFilesIndex]
    const files = dataInfo.linkedGrdmFiles.filter((file) => file.type === "file")
    const totalSize = files.reduce((sum, file) => sum + (file.size || 0), 0)

    return (
      <Box sx={{ display: "flex", flexDirection: "column", gap: "1rem" }}>
        <Typography>
          {t("dataInfo.linkedFiles.description1")}
          <br />
          {t("dataInfo.linkedFiles.description2")}
        </Typography>

        <Typography sx={{ fontWeight: "bold" }}>
          {t("dataInfo.linkedFiles.totalSize")}
          {byteSizeToHumanReadable(totalSize)}
        </Typography>

        <TableContainer component={Paper} variant="outlined" sx={{ borderBottom: "none" }}>
          <Table>
            <TableHead sx={{ backgroundColor: colors.grey[100] }}>
              <TableRow>
                <TableCell sx={{ fontWeight: "bold", textAlign: "left", p: "0.5rem 1rem" }}>{t("dataInfo.linkedFiles.colProjectName")}</TableCell>
                <TableCell sx={{ fontWeight: "bold", textAlign: "left", p: "0.5rem 1rem" }}>{t("dataInfo.linkedFiles.colFilePath")}</TableCell>
                <TableCell sx={{ fontWeight: "bold", textAlign: "left", p: "0.5rem 1rem" }}>{t("dataInfo.linkedFiles.colSize")}</TableCell>
                <TableCell sx={{ fontWeight: "bold", textAlign: "center", p: "0.5rem 1rem" }}>{t("dataInfo.linkedFiles.colCreatedAt")}</TableCell>
                <TableCell sx={{ fontWeight: "bold", textAlign: "center", p: "0.5rem 1rem" }}>{t("dataInfo.linkedFiles.colUpdatedAt")}</TableCell>
                <TableCell sx={{ fontWeight: "bold", textAlign: "center", p: "0.5rem 1rem" }} />
              </TableRow>
            </TableHead>
            <TableBody>
              {files.map((file, index) => {
                const project = projects.find((p) => p.id === file.projectId)
                return (
                  <TableRow key={index}>
                    <TableCell sx={{ p: "0.5rem 1rem" }}>
                      {project ? (
                        <Link
                          href={project.html}
                          target="_blank"
                          rel="noopener noreferrer"
                          sx={{ display: "inline-flex", alignItems: "center", gap: "0.5rem", textDecoration: "none" }}
                        >
                          {project.title}
                          <OpenInNew sx={{ fontSize: "1rem" }} />
                        </Link>
                      ) :
                        "Unknown Project"
                      }
                    </TableCell>
                    <TableCell sx={{ p: "0.5rem 1rem", fontFamily: "monospace" }}>{file.materialized_path}</TableCell>
                    <TableCell sx={{ p: "0.5rem 1rem" }}>
                      {byteSizeToHumanReadable(file.size)}
                    </TableCell>
                    <TableCell sx={{ p: "0.5rem 1rem", textAlign: "center" }}>
                      {file.date_created ? formatDateToTimezone(file.date_created, user.timezone) : "N/A"}
                    </TableCell>
                    <TableCell sx={{ p: "0.5rem 1rem", textAlign: "center" }}>
                      {file.date_modified ? formatDateToTimezone(file.date_modified, user.timezone) : "N/A"}
                    </TableCell>
                    <TableCell sx={{ p: "0.5rem 1rem", textAlign: "center" }}>
                      <Button
                        variant="outlined"
                        color="warning"
                        size="small"
                        onClick={() => handleUnlinkLinkedFile(linkedGrdmFilesIndex, file.nodeId)}
                        startIcon={<LinkOffOutlined />}
                        sx={{ width: "130px" }}
                      >
                        {t("dataInfo.linkedFiles.unlink")}
                      </Button>
                    </TableCell>
                  </TableRow>
                )
              })}
            </TableBody>
          </Table>
        </TableContainer>
      </Box>
    )
  }

  // Delete dialog
  const [pendingDeleteIndex, setPendingDeleteIndex] = useState<number | null>(null)
  const confirmDelete = () => {
    if (pendingDeleteIndex !== null) {
      remove(pendingDeleteIndex)
      setPendingDeleteIndex(null)
    }
  }

  return (
    <Box sx={{ ...sx, display: "flex", flexDirection: "column" }}>
      <SectionHeader text={t("dataInfo.sectionTitle")} />
      <TableContainer component={Paper} variant="outlined" sx={{
        borderBottom: "none",
        mt: "1rem",
        width: "100%",
        overflowX: "auto",
      }}>
        <Table sx={{ minWidth: theme.breakpoints.values.md }}>
          <TableHead sx={{ backgroundColor: colors.grey[100] }}>
            <TableRow>
              {[t("dataInfo.colName"), t("dataInfo.colField"), t("dataInfo.colType"), "", ""].map((header, index) => (
                <TableCell
                  key={index}
                  children={header}
                  sx={{ fontWeight: "bold", textAlign: "left", p: "0.5rem 1rem" }}
                />
              ))}
            </TableRow>
          </TableHead>
          <TableBody>
            {dataInfos.map((dataInfo, index) => (
              <React.Fragment key={index}>
                {/* Data row */}
                <TableRow>
                  <TableCell children={dataInfo.dataName} sx={{ p: "0.5rem 1rem" }} />
                  <TableCell children={dataInfo.researchField} sx={{ p: "0.5rem 1rem" }} />
                  <TableCell children={dataInfo.dataType} sx={{ p: "0.5rem 1rem" }} />
                  <TableCell sx={{ p: "0.5rem 1rem" }} align="right">
                    <Button
                      variant="outlined"
                      color="primary"
                      children={t("dataInfo.linkedFilesButton")}
                      startIcon={<AddLinkOutlined />}
                      onClick={() => setLinkedFilesIndex(index)}
                      sx={{ textTransform: "none" }}
                    />
                  </TableCell>
                  <TableCell sx={{ display: "flex", flexDirection: "row", gap: "0.5rem", p: "0.5rem 1rem", justifyContent: "flex-end" }} align="right">
                    <Button
                      variant="outlined"
                      color="info"
                      children={"Up"}
                      startIcon={<ArrowUpwardOutlined />}
                      onClick={() => move(index, index - 1)}
                      sx={{ textTransform: "none" }}
                      disabled={index === 0}
                    />
                    <Button
                      variant="outlined"
                      color="info"
                      children={"Down"}
                      startIcon={<ArrowDownwardOutlined />}
                      onClick={() => move(index, index + 1)}
                      sx={{ textTransform: "none" }}
                      disabled={index === dataInfos.length - 1}
                    />
                    <Button
                      variant="outlined"
                      color="primary"
                      children={openIndex === index ? t("dataInfo.editClose") : t("dataInfo.editButton")}
                      startIcon={openIndex === index ? <ExpandLessOutlined /> : <EditOutlined />}
                      onClick={() => openIndex === index ? handleClose() : handleOpen(index)}
                    />
                    <Button
                      variant="outlined"
                      color="error"
                      children={t("dataInfo.deleteButton")}
                      startIcon={<DeleteOutline />}
                      onClick={() => setPendingDeleteIndex(index)}
                    />
                  </TableCell>
                </TableRow>
                {/* Accordion row */}
                <TableRow key={`accordion-${index}`}>
                  <TableCell colSpan={5} sx={{ p: 0, border: openIndex === index ? undefined : "none" }}>
                    <Collapse in={openIndex === index} unmountOnExit>
                      <DataInfoForm
                        key={`form-${index}-${openIndex}`}
                        index={index}
                        totalCount={dataInfos.length}
                        onSubmit={handleFormSubmit}
                        onClose={handleClose}
                        researchPhase={researchPhase}
                        personNames={personNames}
                      />
                    </Collapse>
                  </TableCell>
                </TableRow>
              </React.Fragment>
            ))}
            {/* Add new data info accordion row */}
            <TableRow key="accordion-new">
              <TableCell colSpan={5} sx={{ p: 0, border: openIndex === dataInfos.length ? undefined : "none" }}>
                <Collapse in={openIndex === dataInfos.length} unmountOnExit>
                  <DataInfoForm
                    key={`form-new-${openIndex}`}
                    index={dataInfos.length}
                    totalCount={dataInfos.length}
                    onSubmit={handleFormSubmit}
                    onClose={handleClose}
                    researchPhase={researchPhase}
                    personNames={personNames}
                  />
                </Collapse>
              </TableCell>
            </TableRow>
          </TableBody>
        </Table>
      </TableContainer>

      <Button
        variant="outlined"
        color="primary"
        onClick={() => handleOpen(dataInfos.length)}
        sx={{ width: "180px", mt: "1rem" }}
        children={t("dataInfo.addData")}
        startIcon={<AddOutlined />}
      />

      {/* Related GRDM files dialog */}
      <Dialog
        open={linkedGrdmFilesIndex !== null}
        onClose={() => setLinkedFilesIndex(null)}
        fullWidth
        maxWidth="lg"
        closeAfterTransition={false}
      >
        <DialogTitle sx={{ mt: "0.5rem", mx: "1rem" }}>
          {t("dataInfo.linkedFiles.dialogTitle")}
        </DialogTitle>
        <DialogContent sx={{ display: "flex", flexDirection: "column", gap: "1rem", mt: "0.5rem", mx: "1rem" }}>
          {renderLinkedFilesContent()}
        </DialogContent>
        <DialogActions sx={{ m: "0.5rem 1.5rem 1.5rem" }}>
          <Button
            variant="outlined"
            color="secondary"
            onClick={() => setLinkedFilesIndex(null)}
            children={t("dataInfo.linkedFiles.close")}
          />
        </DialogActions>
      </Dialog>

      {/* Delete confirmation dialog */}
      <Dialog
        open={pendingDeleteIndex !== null}
        onClose={() => setPendingDeleteIndex(null)}
        fullWidth
        maxWidth="sm"
        closeAfterTransition={false}
      >
        <DialogTitle sx={{ mt: "0.5rem", mx: "1rem" }}>
          {t("dataInfo.deleteDialog.title")}
        </DialogTitle>
        <DialogContent sx={{ display: "flex", flexDirection: "column", gap: "1rem", mt: "0.5rem", mx: "1rem" }}>
          <Typography>
            {t("dataInfo.deleteDialog.description")}
          </Typography>
        </DialogContent>
        <DialogActions sx={{ m: "0.5rem 1.5rem 1.5rem" }}>
          <Button
            variant="contained"
            color="secondary"
            onClick={confirmDelete}
            children={t("dataInfo.deleteDialog.confirm")}
          />
          <Button
            variant="outlined"
            color="secondary"
            onClick={() => setPendingDeleteIndex(null)}
            children={t("dataInfo.deleteDialog.cancel")}
          />
        </DialogActions>
      </Dialog>
    </Box>
  )
}
