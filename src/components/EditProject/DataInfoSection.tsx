import AddLinkOutlined from "@mui/icons-material/AddLinkOutlined"
import AddOutlined from "@mui/icons-material/AddOutlined"
import ArrowDownwardOutlined from "@mui/icons-material/ArrowDownwardOutlined"
import ArrowUpwardOutlined from "@mui/icons-material/ArrowUpwardOutlined"
import DeleteOutline from "@mui/icons-material/DeleteOutline"
import EditOutlined from "@mui/icons-material/EditOutlined"
import LinkOffOutlined from "@mui/icons-material/LinkOffOutlined"
import OpenInNew from "@mui/icons-material/OpenInNew"
import { Autocomplete, Box, CircularProgress, Dialog, DialogTitle, DialogContent, DialogActions, Button, TextField, MenuItem, FormControl, Chip, TableContainer, Paper, Table, TableHead, TableCell, TableRow, TableBody, colors, Select, FormHelperText, Typography, Link } from "@mui/material"
import { SxProps } from "@mui/system"
import React, { useEffect, useState } from "react"
import { useFormContext, useFieldArray, Controller, useForm, useFormState, FormProvider, useWatch } from "react-hook-form"

import HelpChip from "@/components/EditProject/HelpChip"
import OurFormLabel from "@/components/EditProject/OurFormLabel"
import SectionHeader from "@/components/EditProject/SectionHeader"
import { accessRights, dataType, hasSensitiveData, initDataInfo, researchField } from "@/dmp"
import type { DataInfo, DmpFormValues, ResearchPhase } from "@/dmp"
import { formatDateToTimezone, ProjectInfo } from "@/grdmClient"
import type { RorOrganization } from "@/hooks/useRorSearch"
import { useRorSearch } from "@/hooks/useRorSearch"
import { useSnackbar } from "@/hooks/useSnackbar"
import { User } from "@/hooks/useUser"
import theme from "@/theme"

interface FormData {
  key: keyof DataInfo
  label: string
  required: boolean
  placeholder?: string
  helperText?: string
  type: "text" | "date" | "select"
  options?: string[]
  selectMultiple?: boolean
  helpChip?: React.ReactNode
  minRows?: number
}

const formData: FormData[] = [
  {
    key: "dataName",
    label: "名称",
    required: true,
    type: "text",
    placeholder: "e.g., ○○の実証における○○撮像データ",
    helpChip: (<>
      {"e.g., ○○の実証における○○撮像データ, ○○シミュレーションデータ"}
    </>),
  },
  {
    key: "publicationDate",
    label: "掲載日・掲載更新日",
    required: false, // dynamic: required in 研究中 / 報告時
    type: "date",
  },
  {
    key: "description",
    label: "説明",
    required: true,
    type: "text",
    placeholder: "e.g., ○○実証において、○○撮像画像データ",
    helpChip: (<>
      {"e.g., ○○実証において、○○撮像画像データ。○○ (規格) を利用した撮像データ (日時、気温、天候、センサの設置場所等の詳細情報を含む)"}
      <br />
      {"e.g., ○○時の○○の挙動を予想するためシミュレーションによって得られるデータ。"}
    </>),
    minRows: 3,
  },
  {
    key: "acquisitionMethod",
    label: "データの取得または収集方法",
    required: false,
    type: "text",
    placeholder: "e.g., センサを設置し、自ら取得, 自らシミュレーションを行い取得",
    helpChip: (<>
      {"想定されている関連する標準や方法、品質保証、データの組織化 (命名規則、バージョン管理、フォルダ構造) 等を記述してください。"}
      <br />
      {"e.g., センサを設置し、自ら取得, 自らシミュレーションを行い取得"}
    </>),
    minRows: 3,
  },
  {
    key: "researchField",
    label: "データの分野",
    required: true,
    type: "select",
    options: [...researchField],
  },
  {
    key: "dataType",
    label: "データの種別",
    required: true,
    type: "select",
    options: [...dataType],
  },
  {
    key: "dataSize",
    label: "概略データ量",
    required: false,
    type: "text",
    placeholder: "e.g., <1GB, 1-10GB, 10-100GB, >100GB",
    helpChip: (<>
      {"管理対象データの概ねのデータ容量を以下から選択。"}
      <br />
      {"e.g.,<1GB, 1-10GB, 10-100GB, >100GB"}
      <br />
      {"システムからデータ容量の値を出力できる場合は、データ容量の値そのものをセットしてください。"}
    </>),
  },
  {
    key: "reuseInformation",
    label: "再利用を可能にするための情報",
    required: false,
    type: "text",
    placeholder: "e.g., データ項目に関するコードブックあり",
    helpChip: (<>
      {"可読性を保証するメタデータ等の情報を記載してください"}
    </>),
    minRows: 3,
  },
  {
    key: "hasSensitiveData",
    label: "機密情報の有無",
    required: false,
    type: "select",
    options: ["", ...hasSensitiveData],
  },
  {
    key: "sensitiveDataPolicy",
    label: "機微情報がある場合の取扱い方針",
    required: false,
    type: "text",
    placeholder: "e.g., 個人情報の取扱いについては、関係法令を遵守する。",
    helpChip: (<>
      {"データの保存や共有に関する同意、匿名化処理、センシティブデータの扱い等を記述してください。"}
      <br />
      {"e.g., 個人情報の取扱いについては、関係法令を遵守する。企業との共同研究契約に基づき研究データを管理する。"}
    </>),
    minRows: 3,
  },
  {
    key: "usagePolicy",
    label: "データの利活用・提供方針 (研究活動時)",
    required: true,
    type: "text",
    placeholder: "e.g., △△のデータは取得後随時公開、○○のデータは一定期間経過の後公開",
    helpChip: (<>
      {"e.g., △△のデータは取得後随時公開、○○のデータは一定期間経過の後公開"}
      <br />
      {"e.g., 企業との共同研究も予定していることから、基本的には非公開とする。公開しても問題ないと研究データ取得者が判断したデータについては、研究事業期間中でも広く一般に向け公開することも可能とする。"}
    </>),
    minRows: 3,
  },
  {
    key: "repositoryInformation",
    label: "リポジトリ情報 (研究活動時)",
    required: true,
    type: "text",
    placeholder: "e.g., 研究代表者が所属する○○大学 (研究室) のストレージで保存",
    helpChip: (<>
      {"e.g., 研究代表者が所属する○○大学 (研究室) のストレージで保存"}
      <br />
      {"e.g., 研究中は、各データ取得者が所属する大学 (研究室) のストレージで保存"}
    </>),
    minRows: 3,
  },
  {
    key: "backupLocation",
    label: "データのバックアップ場所 (研究活動時)",
    required: false,
    type: "text",
    placeholder: "e.g., 研究代表者が所属する○○大学 (研究室) のストレージのバックアップサービスによる",
    helpChip: (<>
      {"e.g., 研究代表者が所属する○○大学 (研究室) のストレージのバックアップサービスによる"}
      <br />
      {"e.g., 各データ取得者が所属する大学（研究室)。機関のストレージのバックアップサービスによる"}
    </>),
    minRows: 3,
  },
  {
    key: "publicationPolicy",
    label: "データの公開・提供方針詳細",
    required: false,
    type: "text",
    placeholder: "e.g., 取得後随時公開",
    helpChip: (<>
      {"e.g., 取得後随時公開"}
      <br />
      {"e.g., ○○のデータは研究事業終了後までは非公開とし、終了後 (論文発表後) に一部公開開始。同研究室内 (同プロジェクトメンバー内) でのみ共有。"}
    </>),
    minRows: 3,
  },
  {
    key: "accessRights",
    label: "アクセス権",
    required: true,
    type: "select",
    options: [...accessRights],
  },
  {
    key: "plannedPublicationDate",
    label: "データの公開予定日",
    required: false,
    type: "date",
  },
  {
    key: "repository",
    label: "リポジトリ情報 (リポジトリ URL・DOI リンク) (研究活動後)",
    required: false, // dynamic: required only in 報告時
    type: "text",
    placeholder: "e.g., ○○大学機関リポジトリ, https://doi.org/10.12345/abcde",
    helpChip: (<>
      {"「リポジトリURL・DOIリンク」につきましては、情報がある場合に入力ください。"}
      <br />
      {"DOIが付与されている場合はDOIリンク、DOIが付与されていない場合は当該の管理対象データのランディングページのURLをご記入下さい"}
      <br />
      {"e.g., ○○大学機関リポジトリ, https://doi.org/10.12345/abcde"}
    </>),
  },
  {
    key: "dataCreator",
    label: "データの作成者",
    required: false,
    helperText: "これらの選択肢は、担当者情報から生成されます",
    type: "select",
    options: [], // update before use based on person info
  },
  {
    key: "dataManagementAgency",
    label: "データ管理機関",
    required: true,
    type: "text",
    placeholder: "e.g., ○○大学",
  },
  {
    key: "rorId",
    label: "データ管理機関コード (ROR ID)",
    required: false,
    type: "text",
    placeholder: "e.g., https://ror.org/123456789",
    helpChip: (<>
      {"データ管理機関の Research Organization Registry (ROR) コードがあれば記載して下さい。"}
      <br />
      {"e.g., https://ror.org/123456789"}
    </>),
  },
  {
    key: "dataManager",
    label: "データ管理者 (部署名等)",
    required: true,
    type: "text",
    placeholder: "e.g., ××推進部",
    helpChip: (<>
      {"データ管理機関において各管理対象データを管理する部署名または担当者の名前を入力してください。"}
      <br />
      {"e.g., ××推進部, △△研究室"}
    </>),
  },
  {
    key: "dataManagerContact",
    label: "データ管理者の連絡先",
    required: true,
    type: "text",
    placeholder: "e.g., xxx@xxx, 〇〇県〇〇市××",
    helpChip: (<>
      {"個人情報保護の観点から、個人ではなく組織の連絡先が望ましいです。"}
      <br />
      {"e.g., xxx@xxx, 〇〇県〇〇市××"}
    </>),
  },
  {
    key: "dataStorageLocation",
    label: "研究データの保存場所 (研究事業終了後)",
    required: false,
    type: "text",
    placeholder: "e.g., ○○大学機関リポジトリ, △△研究所内データサーバー",
  },
  {
    key: "dataStoragePeriod",
    label: "研究データの保存期間 (研究事業終了後)",
    required: false,
    type: "text",
    placeholder: "e.g., 永久保存, 10年",
  },
]

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

interface DataManagementAgencyFieldProps {
  label: string
  required: boolean
  helpChip?: React.ReactNode
}

/**
 * Autocomplete field for the data management agency with ROR organization search.
 * Fetches suggestions from the ROR API via the /ror-api proxy (debounced 300ms).
 * When an option is selected, both `dataManagementAgency` and `rorId` are set automatically.
 * Free text input is also supported.
 */
function DataManagementAgencyField({ label, required, helpChip }: DataManagementAgencyFieldProps) {
  const { control, setValue } = useFormContext<DataInfo>()
  const [searchQuery, setSearchQuery] = useState("")
  const { results, isLoading, isError } = useRorSearch(searchQuery)
  const { showSnackbar } = useSnackbar()

  useEffect(() => {
    if (isError) showSnackbar("情報の取得に失敗しました", "error")
  }, [isError, showSnackbar])

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
          </Box>
          <Autocomplete<RorOrganization, false, false, true>
            freeSolo
            filterOptions={(x) => x}
            options={results}
            getOptionLabel={(option) => typeof option === "string" ? option : (option.name ?? "")}
            inputValue={field.value ?? ""}
            onInputChange={(_, newValue, reason) => {
              // Always keep the form field in sync with the input text
              console.log(results)
              field.onChange(newValue)
              // Only trigger search when the user is actively typing or clearing
              if (reason === "input" || reason === "clear") {
                setSearchQuery(newValue)
              }
            }}
            onChange={(_, newValue) => {
              if (newValue !== null && typeof newValue !== "string") {
                // ROR option selected: set both agency name and ROR ID
                field.onChange(newValue.name)
                setValue("rorId", newValue.id)
              } else if (newValue === null) {
                // Cleared via X button: also clear the ROR ID
                setValue("rorId", undefined)
              }
            }}
            loading={isLoading}
            loadingText="検索中..."
            noOptionsText={searchQuery.length >= 2 ? "候補なし" : "2文字以上入力すると候補が表示されます"}
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
                placeholder="e.g., ○○大学"
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

interface DataInfoSectionProps {
  sx?: SxProps
  user: User
  projects: ProjectInfo[]
}

export default function DataInfoSection({ sx, user, projects }: DataInfoSectionProps) {
  const { control } = useFormContext<DmpFormValues>()
  const researchPhase = useWatch({ control, name: "dmp.metadata.researchPhase" }) as ResearchPhase

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

  const { append, remove, move, update } = useFieldArray<DmpFormValues, "dmp.dataInfo">({
    control,
    name: "dmp.dataInfo",
  })
  const dataInfos = useWatch<DmpFormValues>({
    name: "dmp.dataInfo",
    defaultValue: [],
  }) as DmpFormValues["dmp"]["dataInfo"]
  const [openIndex, setOpenIndex] = useState<number | null>(null)
  const [cancelConfirmOpen, setCancelConfirmOpen] = useState(false)

  const dialogMethods = useForm<DataInfo>({
    defaultValues: initDataInfo(),
    mode: "onBlur",
    reValidateMode: "onBlur",
  })
  const { isValid, isSubmitted } = useFormState({
    control: dialogMethods.control,
  })

  const personInfo = useWatch({
    control,
    name: "dmp.personInfo",
  })
  const personNames = personInfo.map((person) => `${person.lastName} ${person.firstName}`.trim())

  const handleOpen = (index: number) => {
    if (index === dataInfos.length) {
      dialogMethods.reset(initDataInfo())
    } else {
      dialogMethods.reset(dataInfos[index] as DataInfo)
    }
    setOpenIndex(index)
  }

  const handleClose = () => {
    if (dialogMethods.formState.isDirty) {
      setCancelConfirmOpen(true)
    } else {
      setOpenIndex(null)
    }
  }

  const handleDiscardAndClose = () => {
    dialogMethods.reset()
    setCancelConfirmOpen(false)
    setOpenIndex(null)
  }

  const handleDialogSubmit = (data: DataInfo) => {
    if (openIndex === null) return
    if (openIndex === dataInfos.length) {
      append(data)
    } else {
      update(openIndex, data)
    }
    handleClose()
  }

  const getValue = <K extends keyof DataInfo>(key: K): DataInfo[K] => {
    const value = dialogMethods.getValues(key)
    if (value === undefined || value === null) {
      return "" as DataInfo[K]
    }
    if (key === "dataCreator") {
      return (personNames[(value as number) - 1] ?? "") as DataInfo[K]
    }
    return value
  }

  const getOptions = <K extends keyof DataInfo>(key: K): string[] => {
    if (key === "dataCreator") {
      return personNames
    }
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
    dialogMethods.setValue(key, newValue as never)
  }

  const getValidationRules = <K extends keyof DataInfo>(key: K, staticRequired: boolean, label: string) => {
    const effectiveRequired = getEffectiveRequired(key, staticRequired)
    if (effectiveRequired) {
      return { required: `${label} は必須です` }
    }
    if (key === "plannedPublicationDate") {
      const accessRightsValue = dialogMethods.getValues("accessRights")
      if (accessRightsValue === "公開期間猶予") {
        return {
          required: "アクセス権が「公開期間猶予」の場合、公開予定日を入力してください",
        }
      }
    }

    return {}
  }

  // Linking Files
  const [linkedGrdmFilesIndex, setLinkedFilesIndex] = useState<number | null>(null)
  const handleUnlinkLinkedFile = (dataInfoIndex: number, nodeId: string) => {
    const dataInfo = dataInfos[dataInfoIndex]
    const newLinkedFiles = dataInfo.linkedGrdmFiles.filter((file) => file.nodeId !== nodeId)
    const updatedDateInfo = { ...dataInfo, linkedGrdmFiles: newLinkedFiles }
    update(dataInfoIndex, updatedDateInfo)
  }

  // Delete Dialog
  const [pendingDeleteIndex, setPendingDeleteIndex] = useState<number | null>(null)
  const confirmDelete = () => {
    if (pendingDeleteIndex !== null) {
      remove(pendingDeleteIndex)
      setPendingDeleteIndex(null)
    }
  }

  const renderLinkedFilesContent = () => {
    if (linkedGrdmFilesIndex === null) return null

    const dataInfo = dataInfos[linkedGrdmFilesIndex]
    const files = dataInfo.linkedGrdmFiles.filter((file) => file.type === "file")
    const totalSize = files.reduce((sum, file) => sum + (file.size || 0), 0)

    return (
      <Box sx={{ display: "flex", flexDirection: "column", gap: "1rem" }}>
        <Typography>
          {"この研究データ情報に関連付けられた GRDM ファイルは以下の通りです。"}
          <br />
          {"新たに GRDM ファイルを関連付ける場合は、ファイルツリーからファイルを選択してください。"}
        </Typography>

        <Typography sx={{ fontWeight: "bold" }}>
          {"データセットの総データサイズ: "}
          {byteSizeToHumanReadable(totalSize)}
        </Typography>

        <TableContainer component={Paper} variant="outlined" sx={{ borderBottom: "none" }}>
          <Table>
            <TableHead sx={{ backgroundColor: colors.grey[100] }}>
              <TableRow>
                <TableCell sx={{ fontWeight: "bold", textAlign: "left", p: "0.5rem 1rem" }}>{"プロジェクト名"}</TableCell>
                <TableCell sx={{ fontWeight: "bold", textAlign: "left", p: "0.5rem 1rem" }}>{"ファイルパス"}</TableCell>
                <TableCell sx={{ fontWeight: "bold", textAlign: "left", p: "0.5rem 1rem" }}>{"サイズ"}</TableCell>
                <TableCell sx={{ fontWeight: "bold", textAlign: "center", p: "0.5rem 1rem" }}>{"作成日"}</TableCell>
                <TableCell sx={{ fontWeight: "bold", textAlign: "center", p: "0.5rem 1rem" }}>{"最終更新日"}</TableCell>
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
                      {
                        file.date_created ?
                          formatDateToTimezone(file.date_created, user.timezone) :
                          "N/A"
                      }
                    </TableCell>
                    <TableCell sx={{ p: "0.5rem 1rem", textAlign: "center" }}>
                      {
                        file.date_modified ?
                          formatDateToTimezone(file.date_modified, user.timezone) :
                          "N/A"
                      }
                    </TableCell>
                    <TableCell sx={{ p: "0.5rem 1rem", textAlign: "center" }}>
                      <Button
                        variant="outlined"
                        color={"warning"}
                        size="small"
                        onClick={() => handleUnlinkLinkedFile(linkedGrdmFilesIndex, file.nodeId)}
                        startIcon={<LinkOffOutlined />}
                        sx={{ width: "130px" }}
                      >
                        {"関連付け解除"}
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

  return (
    <Box sx={{ ...sx, display: "flex", flexDirection: "column" }}>
      <SectionHeader text="研究データ情報" />
      <TableContainer component={Paper} variant="outlined" sx={{
        borderBottom: "none",
        mt: "1rem",
        width: "100%",
        overflowX: "auto",
      }}>
        <Table sx={{ minWidth: theme.breakpoints.values.md }}>
          <TableHead sx={{ backgroundColor: colors.grey[100] }}>
            <TableRow>
              {["名称", "分野", "種別", "", ""].map((header, index) => (
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
              <TableRow key={index}>
                <TableCell children={dataInfo.dataName} sx={{ p: "0.5rem 1rem" }} />
                <TableCell children={dataInfo.researchField} sx={{ p: "0.5rem 1rem" }} />
                <TableCell children={dataInfo.dataType} sx={{ p: "0.5rem 1rem" }} />
                <TableCell sx={{ p: "0.5rem 1rem" }} align="right">
                  <Button
                    variant="outlined"
                    color="primary"
                    children={"関連ファイル"}
                    startIcon={<AddLinkOutlined />}
                    onClick={() => setLinkedFilesIndex(index)}
                    sx={{ textTransform: "none" }}
                  />
                </TableCell>
                <TableCell sx={{ display: "flex", flexDirection: "row", gap: "1rem", p: "0.5rem 1rem", justifyContent: "flex-end" }} align="right">
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
                    children={"編集"}
                    startIcon={<EditOutlined />}
                    onClick={() => handleOpen(index)}
                  />
                  <Button
                    variant="outlined"
                    color="error"
                    children={"削除"}
                    startIcon={<DeleteOutline />}
                    onClick={() => setPendingDeleteIndex(index)}
                  />
                </TableCell>
              </TableRow>
            ))}
          </TableBody>
        </Table>
      </TableContainer>

      <Button
        variant="outlined"
        color="primary"
        onClick={() => handleOpen(dataInfos.length)} sx={{ width: "180px", mt: "1rem" }}
        children="データを追加する"
        startIcon={<AddOutlined />}
      />

      <Dialog
        open={linkedGrdmFilesIndex !== null}
        onClose={() => setLinkedFilesIndex(null)}
        fullWidth
        maxWidth="lg"
        closeAfterTransition={false}
      >
        <DialogTitle sx={{ mt: "0.5rem", mx: "1rem" }}>
          {"関連付けられた GRDM ファイル"}
        </DialogTitle>
        <DialogContent sx={{ display: "flex", flexDirection: "column", gap: "1rem", mt: "0.5rem", mx: "1rem" }}>
          {renderLinkedFilesContent()}
        </DialogContent>
        <DialogActions sx={{ m: "0.5rem 1.5rem 1.5rem" }}>
          <Button
            variant="outlined"
            color="secondary"
            onClick={() => setLinkedFilesIndex(null)}
            children="閉じる"
          />
        </DialogActions>
      </Dialog>

      <Dialog
        open={pendingDeleteIndex !== null}
        onClose={() => setPendingDeleteIndex(null)}
        fullWidth
        maxWidth="sm"
        closeAfterTransition={false}
      >
        <DialogTitle sx={{ mt: "0.5rem", mx: "1rem" }}>
          {"この研究データ情報を削除しますか？"}
        </DialogTitle>
        <DialogContent sx={{ display: "flex", flexDirection: "column", gap: "1rem", mt: "0.5rem", mx: "1rem" }}>
          <Box sx={{ display: "flex", flexDirection: "column", gap: "1rem" }}>
            <Typography>
              {"研究データ情報を削除すると、GRDM File との関連付けも解除されます。"}
            </Typography>
          </Box>
        </DialogContent>
        <DialogActions sx={{ m: "0.5rem 1.5rem 1.5rem" }}>
          <Button
            variant="contained"
            color="secondary"
            onClick={confirmDelete}
            children="削除する"
          />
          <Button
            variant="outlined"
            color="secondary"
            onClick={() => setPendingDeleteIndex(null)}
            children="キャンセル"
          />
        </DialogActions>
      </Dialog>

      <Dialog
        open={openIndex !== null}
        onClose={handleClose}
        fullWidth
        maxWidth="sm"
        closeAfterTransition={false}
      >
        <FormProvider {...dialogMethods}>
          <DialogTitle
            children={openIndex === dataInfos.length ? "管理対象データの追加" : "管理対象データの編集"}
            sx={{ mt: "0.5rem", mx: "1rem" }}
          />
          <DialogContent sx={{ display: "flex", flexDirection: "column", gap: "1rem", mt: "0.5rem", mx: "1rem" }}>
            {openIndex !== null && formData.map(({ key, label, required: staticRequired, helperText, placeholder, type, selectMultiple, helpChip, minRows }) => {
              const effectiveRequired = getEffectiveRequired(key, staticRequired)
              // Render the data management agency field with ROR API autocomplete
              if (key === "dataManagementAgency") {
                return (
                  <DataManagementAgencyField
                    key={key}
                    label={label}
                    required={effectiveRequired}
                    helpChip={helpChip}
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
                        {helpChip && <HelpChip text={helpChip} />}
                      </Box>
                      {!selectMultiple ? (
                        <TextField
                          {...field}
                          fullWidth
                          variant="outlined"
                          error={!!error}
                          helperText={error?.message ?? helperText}
                          placeholder={placeholder}
                          value={getValue(key)}
                          onChange={(e) => updateValue(key, e.target.value)}
                          type={type === "date" ? "date" : "text"}
                          select={type === "select"}
                          size="small"
                          multiline={minRows !== undefined && minRows > 1}
                          minRows={minRows}
                        >
                          {type === "select" &&
                            getOptions(key).map((option) => (
                              <MenuItem key={option} value={option} children={option} />
                            ))}
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
          </DialogContent>
          <DialogActions sx={{ m: "0.5rem 1.5rem 1.5rem" }}>
            <Button
              type="submit"
              children={openIndex === dataInfos.length ? "追加" : "更新"}
              variant="contained"
              color="secondary"
              disabled={isSubmitted && !isValid}
              onClick={dialogMethods.handleSubmit(handleDialogSubmit)}
            />
            <Button children="キャンセル" onClick={handleClose} variant="outlined" color="secondary" />
          </DialogActions>
        </FormProvider>
      </Dialog>

      <Dialog
        open={cancelConfirmOpen}
        onClose={() => setCancelConfirmOpen(false)}
        fullWidth
        maxWidth="xs"
        closeAfterTransition={false}
      >
        <DialogTitle sx={{ mt: "0.5rem", mx: "1rem" }}>
          {"編集中の内容を破棄しますか？"}
        </DialogTitle>
        <DialogContent sx={{ mx: "1rem" }}>
          {"入力中の内容は保存されません。"}
        </DialogContent>
        <DialogActions sx={{ m: "0.5rem 1.5rem 1.5rem" }}>
          <Button
            variant="contained"
            color="error"
            onClick={handleDiscardAndClose}
            children="破棄して閉じる"
          />
          <Button
            variant="outlined"
            color="secondary"
            onClick={() => setCancelConfirmOpen(false)}
            children="編集を続ける"
          />
        </DialogActions>
      </Dialog>
    </Box>
  )
}
