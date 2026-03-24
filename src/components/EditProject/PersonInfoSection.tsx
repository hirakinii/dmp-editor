import AddOutlined from "@mui/icons-material/AddOutlined"
import ArrowDownwardOutlined from "@mui/icons-material/ArrowDownwardOutlined"
import ArrowUpwardOutlined from "@mui/icons-material/ArrowUpwardOutlined"
import DeleteOutline from "@mui/icons-material/DeleteOutline"
import EditOutlined from "@mui/icons-material/EditOutlined"
import ExpandLessOutlined from "@mui/icons-material/ExpandLessOutlined"
import SearchIcon from "@mui/icons-material/Search"
import {
  Box, Button, CircularProgress, Chip, Collapse, Dialog, DialogActions, DialogContent,
  DialogTitle, FormControl, FormHelperText, MenuItem, Paper, Select, Table, TableBody,
  TableCell, TableContainer, TableHead, TableRow, TextField, Typography, colors,
} from "@mui/material"
import { SxProps } from "@mui/system"
import React, { useState } from "react"
import {
  Controller, FormProvider, useFieldArray, useForm, useFormContext, useFormState, useWatch,
} from "react-hook-form"
import { useTranslation } from "react-i18next"

import HelpChip from "@/components/EditProject/HelpChip"
import OurFormLabel from "@/components/EditProject/OurFormLabel"
import SectionHeader from "@/components/EditProject/SectionHeader"
import { initPersonInfo, personRole, PersonInfo, DmpFormValues, ValueSource } from "@/dmp"
import { useGrdmUserSearch } from "@/hooks/useGrdmUserSearch"
import { useSnackbar } from "@/hooks/useSnackbar"
import theme from "@/theme"

// ============================================================
// Types
// ============================================================

interface FieldConfig {
  key: keyof PersonInfo
  labelKey: string
  required: boolean
  type: "text" | "date" | "select"
  options?: string[]
  selectMultiple?: boolean
  helperText?: string
  helpChip?: React.ReactNode
}

// ============================================================
// Field configuration (keys only; labels resolved via t() in components)
// ============================================================

const fieldConfigs: FieldConfig[] = [
  { key: "role", labelKey: "personInfo.fields.role", required: true, type: "select", options: [...personRole], selectMultiple: true },
  { key: "lastName", labelKey: "personInfo.fields.lastName", required: true, type: "text" },
  { key: "firstName", labelKey: "personInfo.fields.firstName", required: true, type: "text" },
  { key: "eRadResearcherId", labelKey: "personInfo.fields.eRadResearcherId", required: false, type: "text" },
  { key: "orcid", labelKey: "personInfo.fields.orcid", required: false, type: "text" },
  { key: "affiliation", labelKey: "personInfo.fields.affiliation", required: true, type: "text" },
  { key: "contact", labelKey: "personInfo.fields.contact", required: false, type: "text" },
  { key: "grdmUserId", labelKey: "personInfo.fields.grdmUserId", required: false, type: "text" },
]

// ============================================================
// SourceBadge — shows the origin of a field value
// ============================================================

function SourceBadge({ source }: { source?: ValueSource }) {
  const { t } = useTranslation("editProject")
  if (!source) return null
  const labels: Record<ValueSource, string> = {
    kaken: "KAKEN",
    grdm: "GRDM",
    manual: t("personInfo.sourceBadge.manual"),
  }
  const chipColors: Record<ValueSource, "info" | "success" | "default"> = {
    kaken: "info",
    grdm: "success",
    manual: "default",
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
// GrdmSearchPanel — search GRDM users by family name
// ============================================================

interface GrdmSearchPanelProps {
  onSelect: (grdmUserId: string, familyName: string, givenName: string, affiliation: string | null, orcid: string | null) => void
}

function GrdmSearchPanel({ onSelect }: GrdmSearchPanelProps) {
  const { t } = useTranslation("editProject")
  const { familyName, setFamilyName, users, isFetching, search } = useGrdmUserSearch()
  const [selectedUserId, setSelectedUserId] = useState<string>("")

  const handleSearch = async () => {
    if (!familyName.trim()) return
    await search()
  }

  const handleSelect = () => {
    const user = users.find((u) => u.id === selectedUserId)
    if (!user) return
    onSelect(user.id, user.familyName, user.givenName, user.affiliation, user.orcid)
    setSelectedUserId("")
  }

  return (
    <Box sx={{ display: "flex", flexDirection: "column", gap: "0.75rem", p: "1rem", backgroundColor: colors.grey[50], borderRadius: "4px", border: `1px solid ${colors.grey[300]}` }}>
      <Typography variant="subtitle2" sx={{ fontWeight: "bold", color: colors.grey[700] }}>
        {t("personInfo.grdmSearch.title")}
      </Typography>
      <Box sx={{ display: "flex", flexDirection: "row", gap: "0.5rem", alignItems: "center" }}>
        <TextField
          label={t("personInfo.grdmSearch.label")}
          placeholder={t("personInfo.grdmSearch.placeholder")}
          value={familyName}
          onChange={(e) => setFamilyName(e.target.value)}
          size="small"
          sx={{ maxWidth: "240px" }}
          onKeyDown={(e) => { if (e.key === "Enter") handleSearch() }}
          slotProps={{
            input: { startAdornment: <SearchIcon fontSize="small" sx={{ mr: 0.5, color: colors.grey[500] }} /> },
          }}
        />
        <Button
          variant="outlined"
          size="small"
          onClick={handleSearch}
          disabled={isFetching || !familyName.trim()}
          startIcon={isFetching ? <CircularProgress size={14} /> : undefined}
        >
          {isFetching ? t("personInfo.grdmSearch.searching") : t("personInfo.grdmSearch.search")}
        </Button>
      </Box>
      {users.length > 0 && (
        <Box sx={{ display: "flex", flexDirection: "row", gap: "0.5rem", alignItems: "center" }}>
          <TextField
            select
            label={t("personInfo.grdmSearch.selectResult")}
            value={selectedUserId}
            onChange={(e) => setSelectedUserId(e.target.value)}
            size="small"
            sx={{ minWidth: "300px" }}
          >
            {users.map((u) => (
              <MenuItem key={u.id} value={u.id}>
                {u.familyName} {u.givenName}
                {u.affiliation ? ` (${u.affiliation})` : ""}
              </MenuItem>
            ))}
          </TextField>
          <Button
            variant="outlined"
            size="small"
            onClick={handleSelect}
            disabled={!selectedUserId}
          >
            {t("personInfo.grdmSearch.applySelected")}
          </Button>
        </Box>
      )}
    </Box>
  )
}

// ============================================================
// PersonInfoForm — accordion content (edit / add form)
// ============================================================

interface PersonInfoFormProps {
  index: number
  totalCount: number
  onSubmit: (data: PersonInfo) => void
  onClose: () => void
}

function PersonInfoForm({ index, totalCount, onSubmit, onClose }: PersonInfoFormProps) {
  const { t } = useTranslation("editProject")
  const dialogMethods = useForm<PersonInfo>({
    defaultValues: initPersonInfo(),
    mode: "onBlur",
    reValidateMode: "onBlur",
  })
  const { isValid, isSubmitted } = useFormState({ control: dialogMethods.control })

  // Sync initial values from parent form when the accordion opens
  const personInfos = useWatch<DmpFormValues>({
    name: "dmp.personInfo",
    defaultValue: [],
  }) as DmpFormValues["dmp"]["personInfo"]

  // Reset form with current values when the component mounts
  useState(() => {
    if (index < totalCount) {
      dialogMethods.reset(personInfos[index] as PersonInfo)
    } else {
      dialogMethods.reset(initPersonInfo())
    }
  })

  const getValue = <K extends keyof PersonInfo>(key: K): PersonInfo[K] => {
    const value = dialogMethods.getValues(key)
    if (value === undefined || value === null) return "" as PersonInfo[K]
    return value
  }

  const updateValue = <K extends keyof PersonInfo>(key: K, value: PersonInfo[K]) => {
    let newValue: PersonInfo[K] = value
    if (newValue === "") newValue = undefined as PersonInfo[K]
    dialogMethods.setValue(key, newValue as never)
    // Mark as manually edited
    const currentSource = dialogMethods.getValues("source") ?? {}
    dialogMethods.setValue("source", { ...currentSource, [key]: "manual" } as never)
  }

  const handleGrdmSelect = (
    grdmUserId: string,
    familyName: string,
    givenName: string,
    affiliation: string | null,
    orcid: string | null,
  ) => {
    const currentSource = dialogMethods.getValues("source") ?? {}
    dialogMethods.setValue("grdmUserId", grdmUserId)
    if (familyName) dialogMethods.setValue("lastName", familyName)
    if (givenName) dialogMethods.setValue("firstName", givenName)
    if (affiliation) dialogMethods.setValue("affiliation", affiliation)
    if (orcid) dialogMethods.setValue("orcid", orcid)
    dialogMethods.setValue("source", {
      ...currentSource,
      grdmUserId: "grdm",
      lastName: familyName ? "grdm" : currentSource.lastName,
      firstName: givenName ? "grdm" : currentSource.firstName,
      affiliation: affiliation ? "grdm" : currentSource.affiliation,
      orcid: orcid ? "grdm" : currentSource.orcid,
    } as never)
    // Trigger re-render of controlled fields
    dialogMethods.trigger()
  }

  const handleSubmit = (data: PersonInfo) => {
    onSubmit(data)
  }

  const isAddMode = index === totalCount

  return (
    <FormProvider {...dialogMethods}>
      <Box sx={{ p: "1.5rem", backgroundColor: colors.grey[50], borderTop: `1px solid ${colors.grey[300]}` }}>
        <Typography variant="subtitle1" sx={{ fontWeight: "bold", mb: "1rem" }}>
          {isAddMode ? t("personInfo.editForm.titleAdd") : t("personInfo.editForm.titleEdit")}
        </Typography>

        {/* GRDM User Search */}
        <Box sx={{ mb: "1.5rem" }}>
          <GrdmSearchPanel onSelect={handleGrdmSelect} />
        </Box>

        {/* Form fields */}
        <Box sx={{ display: "flex", flexDirection: "column", gap: "1rem" }}>
          {fieldConfigs.map(({ key, labelKey, required, helperText, type, options, selectMultiple, helpChip }) => {
            const label = t(labelKey)
            return (
              <Controller
                key={key}
                name={key}
                control={dialogMethods.control}
                rules={required ? { required: t("personInfo.validation.required", { label }) } : {}}
                render={({ field, fieldState: { error } }) => {
                  const source = dialogMethods.watch("source")?.[key as keyof typeof dialogMethods.watch] as ValueSource | undefined
                  return (
                    <FormControl fullWidth>
                      <Box sx={{ display: "flex", flexDirection: "row", alignItems: "center" }}>
                        <OurFormLabel label={label} required={required} />
                        {helpChip && <HelpChip text={helpChip} />}
                        <SourceBadge source={source} />
                      </Box>
                      {!selectMultiple ? (
                        <TextField
                          {...field}
                          fullWidth
                          variant="outlined"
                          error={!!error}
                          helperText={error?.message ?? helperText}
                          value={getValue(key)}
                          onChange={(e) => updateValue(key, e.target.value as PersonInfo[typeof key])}
                          type={type === "date" ? "date" : "text"}
                          select={type === "select"}
                          size="small"
                          sx={{ maxWidth: "480px" }}
                        >
                          {type === "select" &&
                            options!.map((option) => (
                              <MenuItem key={option} value={option}>
                                {t(`enums.personRole.${option}`)}
                              </MenuItem>
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
                            sx={{ maxWidth: "480px" }}
                            onChange={(e) => {
                              field.onChange(e)
                              const currentSource = dialogMethods.getValues("source") ?? {}
                              dialogMethods.setValue("source", { ...currentSource, [key]: "manual" } as never)
                            }}
                            renderValue={(selected) => (
                              <Box sx={{ display: "flex", flexDirection: "row", gap: "0.5rem" }}>
                                {(selected as unknown as string[]).map((value) => (
                                  <Chip key={value} label={t(`enums.personRole.${value}`)} />
                                ))}
                              </Box>
                            )}
                          >
                            {options!.map((option) => (
                              <MenuItem key={option} value={option}>
                                {t(`enums.personRole.${option}`)}
                              </MenuItem>
                            ))}
                          </Select>
                          <FormHelperText error={!!error} children={error?.message ?? helperText} />
                        </>
                      )}
                    </FormControl>
                  )
                }}
              />
            )
          })}
        </Box>

        {/* Actions */}
        <Box sx={{ display: "flex", flexDirection: "row", gap: "1rem", mt: "1.5rem", justifyContent: "flex-start" }}>
          <Button
            type="submit"
            children={isAddMode ? t("personInfo.editForm.add") : t("personInfo.editForm.save")}
            variant="contained"
            color="secondary"
            disabled={isSubmitted && !isValid}
            onClick={dialogMethods.handleSubmit(handleSubmit)}
          />
          <Button
            children={t("personInfo.editForm.cancel")}
            onClick={onClose}
            variant="outlined"
            color="secondary"
            startIcon={<ExpandLessOutlined />}
          />
        </Box>
      </Box>
    </FormProvider>
  )
}

// ============================================================
// PersonInfoSection — main component
// ============================================================

interface PersonInfoSectionProps {
  sx?: SxProps
}

export default function PersonInfoSection({ sx }: PersonInfoSectionProps) {
  const { t } = useTranslation("editProject")
  const { control } = useFormContext<DmpFormValues>()
  const { append, remove, move, update } = useFieldArray<DmpFormValues, "dmp.personInfo">({
    control,
    name: "dmp.personInfo",
  })
  const personInfos = useWatch<DmpFormValues>({
    name: "dmp.personInfo",
    defaultValue: [],
  }) as DmpFormValues["dmp"]["personInfo"]
  const [openIndex, setOpenIndex] = useState<number | null>(null)

  const { showSnackbar } = useSnackbar()

  const handleOpen = (index: number) => {
    setOpenIndex(index)
  }

  const handleClose = () => setOpenIndex(null)

  const handleFormSubmit = (data: PersonInfo) => {
    if (openIndex === null) return

    // Duplicate person check (lastName + firstName + affiliation)
    const isDuplicate = personInfos.some((p, i) => {
      if (i === openIndex) return false
      return (
        p.lastName === data.lastName &&
        p.firstName === data.firstName &&
        p.affiliation === data.affiliation
      )
    })
    if (isDuplicate) {
      showSnackbar(t("personInfo.validation.duplicate"), "warning")
      return
    }

    // Unique role constraints
    const uniqueRoles = ["研究代表者", "管理対象データの管理責任者"] as const
    for (const role of uniqueRoles) {
      if (data.role.includes(role)) {
        const alreadyExists = personInfos.some((p, i) => {
          if (i === openIndex) return false
          return p.role.includes(role)
        })
        if (alreadyExists) {
          showSnackbar(t("personInfo.validation.uniqueRole", { role: t(`enums.personRole.${role}`) }), "error")
          return
        }
      }
    }

    if (openIndex === personInfos.length) {
      append(data)
    } else {
      update(openIndex, data)
    }
    handleClose()
  }

  // Delete Dialog
  const { update: updateDataInfo } = useFieldArray<DmpFormValues, "dmp.dataInfo">({
    control,
    name: "dmp.dataInfo",
  })
  const dataInfos = useWatch<DmpFormValues>({
    name: "dmp.dataInfo",
    defaultValue: [],
  }) as DmpFormValues["dmp"]["dataInfo"]
  const [pendingDeleteIndex, setPendingDeleteIndex] = useState<number | null>(null)

  const confirmDelete = () => {
    if (pendingDeleteIndex !== null) {
      dataInfos.forEach((info, index) => {
        if (info?.dataCreator === undefined || info?.dataCreator === null) return
        if (info.dataCreator === pendingDeleteIndex) {
          updateDataInfo(index, { ...info, dataCreator: undefined })
        }
      })
      remove(pendingDeleteIndex)
      setPendingDeleteIndex(null)
    }
  }

  return (
    <Box sx={{ ...sx, display: "flex", flexDirection: "column" }}>
      <SectionHeader text={t("personInfo.sectionTitle")} />
      <TableContainer component={Paper} variant="outlined" sx={{
        borderBottom: "none",
        mt: "1rem",
        width: "100%",
        overflowX: "auto",
      }}>
        <Table sx={{ minWidth: theme.breakpoints.values.md }}>
          <TableHead sx={{ backgroundColor: colors.grey[100] }}>
            <TableRow>
              {[
                t("personInfo.colRole"),
                t("personInfo.colName"),
                t("personInfo.colERadId"),
                t("personInfo.colOrcid"),
                t("personInfo.colAffiliation"),
                t("personInfo.colContact"),
                "",
              ].map((header, index) => (
                <TableCell
                  key={index}
                  children={header}
                  sx={{ fontWeight: "bold", textAlign: "left", p: "0.5rem 1rem" }}
                />
              ))}
            </TableRow>
          </TableHead>
          <TableBody>
            {personInfos.map((personInfo, index) => (
              <React.Fragment key={index}>
                {/* Data row */}
                <TableRow>
                  <TableCell sx={{ p: "0.5rem 1rem" }}>
                    <Box sx={{ display: "flex", alignItems: "center", gap: 0.5 }}>
                      {personInfo.role.map((r) => t(`enums.personRole.${r}`)).join(", ")}
                      <SourceBadge source={personInfo.source?.role} />
                    </Box>
                  </TableCell>
                  <TableCell sx={{ p: "0.5rem 1rem" }}>
                    <Box sx={{ display: "flex", alignItems: "center", gap: 0.5 }}>
                      {`${personInfo.lastName} ${personInfo.firstName}`}
                      <SourceBadge source={personInfo.source?.lastName ?? personInfo.source?.firstName} />
                    </Box>
                  </TableCell>
                  <TableCell sx={{ p: "0.5rem 1rem" }}>
                    <Box sx={{ display: "flex", alignItems: "center", gap: 0.5 }}>
                      {personInfo.eRadResearcherId ?? ""}
                      <SourceBadge source={personInfo.source?.eRadResearcherId} />
                    </Box>
                  </TableCell>
                  <TableCell sx={{ p: "0.5rem 1rem" }}>
                    <Box sx={{ display: "flex", alignItems: "center", gap: 0.5 }}>
                      {personInfo.orcid ?? ""}
                      <SourceBadge source={personInfo.source?.orcid} />
                    </Box>
                  </TableCell>
                  <TableCell sx={{ p: "0.5rem 1rem" }}>
                    <Box sx={{ display: "flex", alignItems: "center", gap: 0.5 }}>
                      {personInfo.affiliation}
                      <SourceBadge source={personInfo.source?.affiliation} />
                    </Box>
                  </TableCell>
                  <TableCell sx={{ p: "0.5rem 1rem" }}>
                    <Box sx={{ display: "flex", alignItems: "center", gap: 0.5 }}>
                      {personInfo.contact ?? ""}
                      <SourceBadge source={personInfo.source?.contact} />
                    </Box>
                  </TableCell>
                  <TableCell sx={{ display: "flex", flexDirection: "row", gap: "0.5rem", p: "0.5rem 1rem", justifyContent: "flex-end" }} align="right">
                    <Button
                      variant="outlined"
                      color="info"
                      children="Up"
                      startIcon={<ArrowUpwardOutlined />}
                      onClick={() => move(index, index - 1)}
                      sx={{ textTransform: "none" }}
                      disabled={index === 0}
                    />
                    <Button
                      variant="outlined"
                      color="info"
                      children="Down"
                      startIcon={<ArrowDownwardOutlined />}
                      onClick={() => move(index, index + 1)}
                      sx={{ textTransform: "none" }}
                      disabled={index === personInfos.length - 1}
                    />
                    <Button
                      variant="outlined"
                      color="primary"
                      children={openIndex === index ? t("personInfo.editClose") : t("personInfo.editButton")}
                      startIcon={openIndex === index ? <ExpandLessOutlined /> : <EditOutlined />}
                      onClick={() => openIndex === index ? handleClose() : handleOpen(index)}
                    />
                    <Button
                      variant="outlined"
                      color="error"
                      children={t("personInfo.deleteButton")}
                      startIcon={<DeleteOutline />}
                      onClick={() => setPendingDeleteIndex(index)}
                    />
                  </TableCell>
                </TableRow>
                {/* Accordion row */}
                <TableRow key={`accordion-${index}`}>
                  <TableCell colSpan={7} sx={{ p: 0, border: openIndex === index ? undefined : "none" }}>
                    <Collapse in={openIndex === index} unmountOnExit>
                      <PersonInfoForm
                        key={`form-${index}-${openIndex}`}
                        index={index}
                        totalCount={personInfos.length}
                        onSubmit={handleFormSubmit}
                        onClose={handleClose}
                      />
                    </Collapse>
                  </TableCell>
                </TableRow>
              </React.Fragment>
            ))}
            {/* Add new person accordion row */}
            <TableRow key="accordion-new">
              <TableCell colSpan={7} sx={{ p: 0, border: openIndex === personInfos.length ? undefined : "none" }}>
                <Collapse in={openIndex === personInfos.length} unmountOnExit>
                  <PersonInfoForm
                    key={`form-new-${openIndex}`}
                    index={personInfos.length}
                    totalCount={personInfos.length}
                    onSubmit={handleFormSubmit}
                    onClose={handleClose}
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
        onClick={() => handleOpen(personInfos.length)}
        sx={{ width: "180px", mt: "1rem" }}
        children={t("personInfo.addPerson")}
        startIcon={<AddOutlined />}
      />

      {/* Delete confirmation dialog */}
      <Dialog
        open={pendingDeleteIndex !== null}
        onClose={() => setPendingDeleteIndex(null)}
        fullWidth
        maxWidth="sm"
        closeAfterTransition={false}
      >
        <DialogTitle sx={{ mt: "0.5rem", mx: "1rem" }}>
          {t("personInfo.deleteDialog.title")}
        </DialogTitle>
        <DialogContent sx={{ display: "flex", flexDirection: "column", gap: "1rem", mt: "0.5rem", mx: "1rem" }}>
          <Box sx={{ display: "flex", flexDirection: "column", gap: "1rem" }}>
            <Typography>
              {t("personInfo.deleteDialog.description")}
            </Typography>
          </Box>
        </DialogContent>
        <DialogActions sx={{ m: "0.5rem 1.5rem 1.5rem" }}>
          <Button
            variant="contained"
            color="secondary"
            onClick={confirmDelete}
            children={t("personInfo.deleteDialog.confirm")}
          />
          <Button
            variant="outlined"
            color="secondary"
            onClick={() => setPendingDeleteIndex(null)}
            children={t("personInfo.deleteDialog.cancel")}
          />
        </DialogActions>
      </Dialog>
    </Box>
  )
}
