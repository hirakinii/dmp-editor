import AddOutlined from "@mui/icons-material/AddOutlined"
import ArrowDownwardOutlined from "@mui/icons-material/ArrowDownwardOutlined"
import ArrowUpwardOutlined from "@mui/icons-material/ArrowUpwardOutlined"
import DeleteOutline from "@mui/icons-material/DeleteOutline"
import EditOutlined from "@mui/icons-material/EditOutlined"
import { Box, Button, Dialog, DialogTitle, DialogContent, DialogActions, TextField, MenuItem, FormControl, Chip, Select, TableContainer, Paper, Table, TableHead, TableCell, TableRow, TableBody, colors, FormHelperText, Typography } from "@mui/material"
import { SxProps } from "@mui/system"
import { useState } from "react"
import { useFormContext, useFieldArray, Controller, useForm, FormProvider, useFormState, useWatch } from "react-hook-form"

import HelpChip from "@/components/EditProject/HelpChip"
import OurFormLabel from "@/components/EditProject/OurFormLabel"
import SectionHeader from "@/components/EditProject/SectionHeader"
import { initPersonInfo, personRole, PersonInfo, DmpFormValues } from "@/dmp"
import { useSnackbar } from "@/hooks/useSnackbar"
import theme from "@/theme"

interface FormData {
  key: keyof PersonInfo
  label: string
  required: boolean
  type: "text" | "date" | "select"
  options?: string[]
  selectMultiple?: boolean
  helperText?: string
  helpChip?: React.ReactNode
}

const formData: FormData[] = [
  {
    key: "role",
    label: "役割",
    required: true,
    type: "select",
    options: [...personRole],
    selectMultiple: true,
  },
  {
    key: "lastName",
    label: "姓",
    required: true,
    type: "text",
  },
  {
    key: "firstName",
    label: "名",
    required: true,
    type: "text",
  },
  {
    key: "eRadResearcherId",
    label: "e-Rad 研究者番号",
    required: false,
    type: "text",
  },
  {
    key: "orcid",
    label: "ORCID",
    required: false,
    type: "text",
  },
  {
    key: "affiliation",
    label: "所属機関",
    required: true,
    type: "text",
  },
  {
    key: "contact",
    label: "連絡先（メールアドレス）",
    required: false,
    type: "text",
  },
]

interface PersonInfoSectionProps {
  sx?: SxProps
}

export default function PersonInfoSection({ sx }: PersonInfoSectionProps) {
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

  const dialogMethods = useForm<PersonInfo>({
    defaultValues: initPersonInfo(),
    mode: "onBlur",
    reValidateMode: "onBlur",
  })
  const { isValid, isSubmitted } = useFormState({
    control: dialogMethods.control,
  })
  const { showSnackbar } = useSnackbar()

  const handleOpen = (index: number) => {
    if (index === personInfos.length) {
      dialogMethods.reset(initPersonInfo())
    } else {
      dialogMethods.reset(personInfos[index] as PersonInfo)
    }
    setOpenIndex(index)
  }

  const handleClose = () => setOpenIndex(null)

  const handleDialogSubmit = (data: PersonInfo) => {
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
      showSnackbar("同じ担当者がすでに登録されています", "warning")
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
          showSnackbar(`「${role}」はすでに登録されています。一名のみ登録できます。`, "error")
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

  const getValue = <K extends keyof PersonInfo>(key: K): PersonInfo[K] => {
    const value = dialogMethods.getValues(key)
    if (value === undefined || value === null) {
      return "" as PersonInfo[K]
    }
    return value
  }

  const updateValue = <K extends keyof PersonInfo>(key: K, value: PersonInfo[K]) => {
    let newValue: PersonInfo[K] = value
    if (newValue === "") {
      newValue = undefined as PersonInfo[K]
    }
    dialogMethods.setValue(key, newValue as never)
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
          updateDataInfo(index, {
            ...info,
            dataCreator: undefined,
          })
        }
      })

      remove(pendingDeleteIndex)
      setPendingDeleteIndex(null)
    }
  }

  return (
    <Box sx={{ ...sx, display: "flex", flexDirection: "column" }}>
      <SectionHeader text="担当者情報" />
      <TableContainer component={Paper} variant="outlined" sx={{
        borderBottom: "none",
        mt: "1rem",
        width: "100%",
        overflowX: "auto",
      }}>
        <Table sx={{ minWidth: theme.breakpoints.values.md }}>
          <TableHead sx={{ backgroundColor: colors.grey[100] }}>
            <TableRow>
              {["役割", "名前", "e-Rad 研究者番号", "ORCID", "所属機関", "連絡先", ""].map((header, index) => (
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
              <TableRow key={index}>
                <TableCell children={personInfo.role.join(", ")} sx={{ p: "0.5rem 1rem" }} />
                <TableCell children={`${personInfo.lastName} ${personInfo.firstName}`} sx={{ p: "0.5rem 1rem" }} />
                <TableCell children={personInfo.eRadResearcherId ?? ""} sx={{ p: "0.5rem 1rem" }} />
                <TableCell children={personInfo.orcid ?? ""} sx={{ p: "0.5rem 1rem" }} />
                <TableCell children={personInfo.affiliation} sx={{ p: "0.5rem 1rem" }} />
                <TableCell children={personInfo.contact ?? ""} sx={{ p: "0.5rem 1rem" }} />
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
                    disabled={index === personInfos.length - 1}
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
        onClick={() => handleOpen(personInfos.length)} sx={{ width: "180px", mt: "1rem" }}
        children="担当者を追加する"
        startIcon={<AddOutlined />}
      />

      <Dialog
        open={pendingDeleteIndex !== null}
        onClose={() => setPendingDeleteIndex(null)}
        fullWidth
        maxWidth="sm"
        closeAfterTransition={false}
      >
        <DialogTitle sx={{ mt: "0.5rem", mx: "1rem" }}>
          {"この担当者情報を削除しますか？"}
        </DialogTitle>
        <DialogContent sx={{ display: "flex", flexDirection: "column", gap: "1rem", mt: "0.5rem", mx: "1rem" }}>
          <Box sx={{ display: "flex", flexDirection: "column", gap: "1rem" }}>
            <Typography>
              {"担当者情報を削除すると、関連する研究データ情報も削除されます。"}
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
            children={openIndex === personInfos.length ? "担当者の追加" : "担当者の編集"}
            sx={{ mt: "0.5rem", mx: "1rem" }}
          />
          <DialogContent sx={{ display: "flex", flexDirection: "column", gap: "1rem", mt: "0.5rem", mx: "1rem" }}>
            {openIndex !== null && formData.map(({ key, label, required, helperText, type, options, selectMultiple, helpChip }) => (
              <Controller
                key={key}
                name={key}
                control={dialogMethods.control}
                rules={required ? { required: `${label} は必須です` } : {}}
                render={({ field, fieldState: { error } }) => (
                  <FormControl fullWidth>
                    <Box sx={{ display: "flex", flexDirection: "row", alignItems: "center" }}>
                      <OurFormLabel label={label} required={required} />
                      {helpChip && <HelpChip text={helpChip} />}
                    </Box>
                    {!selectMultiple ? (
                      <TextField
                        {...field}
                        fullWidth
                        variant="outlined"
                        error={!!error}
                        helperText={error?.message ?? helperText}
                        value={getValue(key)}
                        onChange={(e) => updateValue(key, e.target.value)}
                        type={type === "date" ? "date" : "text"}
                        select={type === "select"}
                        size="small"
                      >
                        {type === "select" &&
                          options!.map((option) => (
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
                          {options!.map((option) => (
                            <MenuItem key={option} value={option} children={option} />
                          ))}
                        </Select>
                        <FormHelperText error={!!error} children={error?.message ?? helperText} />
                      </>
                    )}
                  </FormControl>
                )}
              />
            ))}
          </DialogContent>
          <DialogActions sx={{ m: "0.5rem 1.5rem 1.5rem" }}>
            <Button
              type="submit"
              children={openIndex === personInfos.length ? "追加" : "編集"}
              variant="contained"
              color="secondary"
              disabled={isSubmitted && !isValid}
              onClick={dialogMethods.handleSubmit(handleDialogSubmit)}
            />
            <Button children="キャンセル" onClick={handleClose} variant="outlined" color="secondary" />
          </DialogActions>
        </FormProvider>
      </Dialog>
    </Box>
  )
}
