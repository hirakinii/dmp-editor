import SaveOutlined from "@mui/icons-material/SaveOutlined"
import {
  Box,
  Button,
  Divider,
  Step,
  StepButton,
  StepIcon,
  StepLabel,
  Stepper,
  Typography,
} from "@mui/material"
import type { StepIconProps } from "@mui/material"
import { SxProps } from "@mui/system"
import { useState } from "react"
import { FieldPath, useFormContext } from "react-hook-form"
import { useTranslation } from "react-i18next"
import { useNavigate, useParams } from "react-router-dom"

import DataInfoSection from "@/components/EditProject/DataInfoSection"
import DmpMetaSection from "@/components/EditProject/DmpMetaSection"
import FileTreeSection from "@/components/EditProject/FileTreeSection"
import PersonInfoSection from "@/components/EditProject/PersonInfoSection"
import ProjectInfoSection from "@/components/EditProject/ProjectInfoSection"
import ProjectTableSection from "@/components/EditProject/ProjectTableSection"
import OurCard from "@/components/OurCard"
import { DmpFormValues, todayString } from "@/dmp"
import { ProjectInfo } from "@/grdmClient"
import { useSnackbar } from "@/hooks/useSnackbar"
import { PartialSaveError, useUpdateDmp } from "@/hooks/useUpdateDmp"
import { User } from "@/hooks/useUser"

export interface FormCardProps {
  sx?: SxProps
  isNew: boolean
  user: User
  project?: ProjectInfo | null
  projects: ProjectInfo[]
  isProjectsLoading?: boolean
  /** Called immediately when the save mutation starts (to show a full-page loading overlay). */
  onSaveStart: () => void
  /** Called when the save mutation fails (to hide the loading overlay). */
  onSaveEnd: () => void
}

const STEP_FIELDS: Record<number, FieldPath<DmpFormValues>[]> = {
  0: [
    "dmp.metadata.revisionType",
    "dmp.metadata.submissionDate",
    "dmp.metadata.dateCreated",
  ],
  1: [
    "dmp.projectInfo.fundingAgency",
    "dmp.projectInfo.projectCode",
    "dmp.projectInfo.projectName",
  ],
  2: [], // PersonInfoSection: validated individually in dialog
  3: [], // DataInfoSection: validated individually in dialog
  4: [], // GRDM connection: no validation required
}

/** Step icon that renders a red circle with "!" when the step has a validation error. */
function CustomStepIcon(props: StepIconProps) {
  const { error, ...rest } = props
  if (error) {
    return (
      <Box
        data-testid="step-error-icon"
        sx={{
          width: 24,
          height: 24,
          borderRadius: "50%",
          backgroundColor: "error.main",
          color: "white",
          display: "flex",
          alignItems: "center",
          justifyContent: "center",
          fontSize: "0.875rem",
          fontWeight: "bold",
        }}
      >
        !
      </Box>
    )
  }
  return <StepIcon {...rest} />
}

export default function FormCard({ sx, isNew = false, user, project, projects, isProjectsLoading = false, onSaveStart, onSaveEnd }: FormCardProps) {
  const { t } = useTranslation("editProject")
  const { projectId = "" } = useParams<{ projectId: string }>()
  const navigate = useNavigate()
  const { getValues, setValue, handleSubmit, formState, reset, trigger } = useFormContext<DmpFormValues>()
  const { isValid, isSubmitted } = formState
  const updateMutation = useUpdateDmp()
  const { showSnackbar } = useSnackbar()
  const [isSaving, setIsSaving] = useState(false)
  const [activeStep, setActiveStep] = useState(0)
  const [stepErrors, setStepErrors] = useState<Set<number>>(new Set())

  const STEPS = [
    { label: t("formCard.steps.basicSettings") },
    { label: t("formCard.steps.projectInfo") },
    { label: t("formCard.steps.personInfo") },
    { label: t("formCard.steps.dataInfo") },
    { label: t("formCard.steps.grdmLink") },
  ] as const

  /** Converts a save error into a user-readable message. */
  const formatSaveError = (error: unknown): string => {
    const prefix = t("formCard.saveError.prefix")
    if (error instanceof PartialSaveError) {
      return t("formCard.saveError.partialSave")
    }
    if (error instanceof Error) {
      if (error.name === "AbortError" || error.message.toLowerCase().includes("timeout")) {
        return t("formCard.saveError.timeout")
      }
      if (error.message.includes("429")) {
        return `${prefix}：リクエスト数が上限を超えました (429)`
      }
      return `${prefix}：${error.message}`
    }
    return prefix
  }

  /** Validate the fields for a given step and update the stepErrors set. */
  const validateStepFields = async (stepIndex: number): Promise<boolean> => {
    const fields = STEP_FIELDS[stepIndex]
    if (fields.length === 0) {
      setStepErrors((prev) => {
        const next = new Set(prev)
        next.delete(stepIndex)
        return next
      })
      return true
    }
    const valid = await trigger(fields)
    setStepErrors((prev) => {
      const next = new Set(prev)
      if (valid) next.delete(stepIndex)
      else next.add(stepIndex)
      return next
    })
    return valid
  }

  const onSubmit = async () => {
    setValue("dmp.metadata.dateModified", todayString())
    const formValues = getValues()
    setIsSaving(true)
    onSaveStart()

    updateMutation.mutate(
      { projectId, isNew, formValues, currentProjectTitle: project?.title },
      {
        onSuccess: (newProjectId: string) => {
          showSnackbar(t("formCard.saveDone"), "success")
          // reset() updates the RHF live store (isDirty = false) synchronously.
          // The useBlocker in EditProject reads from the live store via a stable
          // ref function, so navigate() called right after is not blocked.
          reset(formValues)
          const targetProjectId = isNew ? newProjectId : projectId
          // Last step: navigate to detail page for both new and existing projects.
          // isSaving remains true; the component unmounts via navigation so no cleanup needed.
          navigate(`/projects/${targetProjectId}/detail`)
        },
        onError: (error) => {
          setIsSaving(false)
          onSaveEnd()
          showSnackbar(formatSaveError(error), "error")
        },
      },
    )
  }

  const handleNext = async () => {
    const valid = await validateStepFields(activeStep)
    if (valid) {
      setActiveStep((prev) => prev + 1)
    }
  }

  const handleBack = () => {
    setActiveStep((prev) => prev - 1)
  }

  /**
   * Handle step bar click. Validates the current step's fields and updates the
   * error indicator, then navigates to the clicked step regardless of validity.
   *
   * In isNew mode this handler is only called for steps before the current step
   * (going back), because future steps are rendered as non-interactive StepLabel.
   */
  const handleStepClick = async (targetStep: number) => {
    await validateStepFields(activeStep)
    setActiveStep(targetStep)
  }

  const isButtonDisabled = () => {
    if (isSaving) return true
    return isSubmitted && !isValid
  }

  return (
    <OurCard sx={sx}>
      <Box component="form" onSubmit={handleSubmit(onSubmit)}>
        <Typography
          sx={{ fontSize: "1.5rem" }}
          component="h1"
          children={isNew ? t("formCard.titleNew") : t("formCard.titleEdit")}
        />

        <Stepper activeStep={activeStep} alternativeLabel nonLinear sx={{ mt: "1.5rem" }}>
          {STEPS.map((step, i) => {
            const hasError = stepErrors.has(i)
            // isNew: only allow clicking steps already visited (i < activeStep, going back).
            // isNew=false: allow clicking any step except the currently active one.
            const isClickable = isNew ? i < activeStep : i !== activeStep
            return (
              <Step key={step.label} completed={i < activeStep}>
                {isClickable ? (
                  // Render StepLabel as child so MUI cloneElement preserves error/StepIconComponent.
                  // StepButton does not forward StepLabelProps in MUI v7.
                  <StepButton onClick={() => handleStepClick(i)}>
                    <StepLabel error={hasError} StepIconComponent={CustomStepIcon}>
                      {step.label}
                    </StepLabel>
                  </StepButton>
                ) : (
                  <StepLabel error={hasError} StepIconComponent={CustomStepIcon}>
                    {step.label}
                  </StepLabel>
                )}
              </Step>
            )
          })}
        </Stepper>

        <Box sx={{ mt: "2rem" }}>
          {activeStep === 0 && (
            <DmpMetaSection isNew={isNew} project={project} />
          )}
          {activeStep === 1 && <ProjectInfoSection />}
          {activeStep === 2 && <PersonInfoSection />}
          {activeStep === 3 && <DataInfoSection user={user} projects={projects} />}
          {activeStep === 4 && (
            <>
              <ProjectTableSection user={user} projects={projects} isLoading={isProjectsLoading} />
              <Divider sx={{ my: "1.5rem" }} />
              <FileTreeSection projects={projects} />
            </>
          )}
        </Box>

        <Box sx={{ display: "flex", flexDirection: "row", gap: "1rem", mt: "2rem", alignItems: "center" }}>
          <Button variant="outlined" onClick={handleBack} disabled={activeStep === 0}>
            {t("formCard.back")}
          </Button>
          {activeStep < STEPS.length - 1 && (
            <Button variant="contained" onClick={handleNext}>
              {t("formCard.next")}
            </Button>
          )}
          <Box sx={{ flexGrow: 1 }} />
          {activeStep === STEPS.length - 1 && (
            <Button
              variant="contained"
              color="secondary"
              type="submit"
              sx={{ textTransform: "none", width: "180px" }}
              startIcon={<SaveOutlined />}
              disabled={isButtonDisabled()}
            >
              {t("formCard.saveToGrdm")}
            </Button>
          )}
        </Box>
      </Box>
    </OurCard>
  )
}
