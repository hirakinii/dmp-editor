import { Box, TextField, FormControl, MenuItem } from "@mui/material"
import { SxProps } from "@mui/system"
import { useFormContext, Controller } from "react-hook-form"
import { useTranslation } from "react-i18next"

import OurFormLabel from "@/components/EditProject/OurFormLabel"
import SectionHeader from "@/components/EditProject/SectionHeader"
import { DmpFormValues, revisionType } from "@/dmp"
import type { DmpMetadata } from "@/dmp"

interface FormDataConfig {
  key: keyof DmpMetadata
  labelKey: string
  required: boolean
  width: string
  helperText?: string
  type: "text" | "date" | "select"
  options?: readonly string[]
  /** When true, the field is displayed but cannot be edited by the user. */
  readOnly?: boolean
}

const formDataConfig: FormDataConfig[] = [
  {
    key: "revisionType",
    labelKey: "dmpMeta.fields.revisionType",
    required: true,
    width: "480px",
    type: "select",
    options: revisionType,
  },
  {
    key: "submissionDate",
    labelKey: "dmpMeta.fields.submissionDate",
    required: true,
    width: "480px",
    type: "date",
  },
  {
    key: "dateCreated",
    labelKey: "dmpMeta.fields.dateCreated",
    required: true,
    width: "480px",
    type: "date",
    readOnly: true,
  },
]

interface DmpMetadataSectionProps {
  sx?: SxProps
  isNew?: boolean
}

export default function DmpMetadataSection({ sx, isNew = false }: DmpMetadataSectionProps) {
  const { t } = useTranslation("editProject")
  const { control, getValues } = useFormContext<DmpFormValues>()

  return (
    <Box sx={{ ...sx, display: "flex", flexDirection: "column" }}>
      <SectionHeader text={t("dmpMeta.section")} />
      <Box sx={{ display: "flex", flexDirection: "column", gap: "1rem", mt: "1rem" }}>
        {formDataConfig.map(({ key, labelKey, required, width, helperText, type, options, readOnly }) => {
          const label = t(labelKey)
          // In new-DMP mode, revisionType is fixed to "新規" and must not be editable.
          const isDisabled = readOnly || (isNew && key === "revisionType")
          return (
            <Controller
              key={key}
              name={`dmp.metadata.${key}`}
              control={control}
              rules={
                key === "submissionDate"
                  ? {
                    required: t("dmpMeta.validation.required", { label }),
                    validate: (value) => {
                      const dateCreated = getValues("dmp.metadata.dateCreated")
                      if (dateCreated && value && value < dateCreated) {
                        return t("dmpMeta.validation.submissionDateAfterCreated")
                      }
                    },
                  }
                  : required
                    ? { required: t("dmpMeta.validation.required", { label }) }
                    : {}
              }
              render={({ field, fieldState: { error } }) => (
                <FormControl fullWidth>
                  <OurFormLabel label={label} required={required} htmlFor={`metadata.${key}`} />
                  <TextField
                    {...field}
                    fullWidth
                    variant="outlined"
                    error={!!error}
                    helperText={error?.message ?? helperText}
                    sx={{ maxWidth: width }}
                    type={type === "date" ? "date" : "text"}
                    select={type === "select"}
                    size="small"
                    disabled={isDisabled}
                  >
                    {type === "select" &&
                      options!.map((option) => (
                        <MenuItem key={option} value={option}>
                          {t(`enums.revisionType.${option}`)}
                        </MenuItem>
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
