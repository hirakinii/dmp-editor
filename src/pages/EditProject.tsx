import {
  Backdrop,
  Button,
  CircularProgress,
  Dialog,
  DialogActions,
  DialogContent,
  DialogContentText,
  DialogTitle,
  Typography,
} from "@mui/material"
import { useEffect, useRef, useState } from "react"
import { useForm, FormProvider } from "react-hook-form"
import { useTranslation } from "react-i18next"
import { useParams } from "react-router-dom"

import FormCard from "@/components/EditProject/FormCard"
import Frame from "@/components/Frame"
import Loading from "@/components/Loading"
import { initDmp, DmpFormValues } from "@/dmp"
import { useDmp } from "@/hooks/useDmp"
import { useProjectInfo } from "@/hooks/useProjectInfo"
import { useProjects } from "@/hooks/useProjects"
import { useUnsavedChangesWarning } from "@/hooks/useUnsavedChangesWarning"
import { useUser } from "@/hooks/useUser"

interface EditProjectProps {
  isNew?: boolean
}

export default function EditProject({ isNew = false }: EditProjectProps) {
  const { t } = useTranslation("editProject")
  const { projectId = "" } = useParams<{ projectId: string }>()
  const dmpQuery = useDmp(projectId, isNew)
  const userQuery = useUser()
  const projectQuery = useProjectInfo(projectId, isNew)
  const projectsQuery = useProjects()

  const [formInitialized, setFormInitialized] = useState(false)
  const [minDelayComplete, setMinDelayComplete] = useState(false)
  const [isSaving, setIsSaving] = useState(false)

  useEffect(() => {
    if (!isNew) return
    const timer = setTimeout(() => setMinDelayComplete(true), 500)
    return () => clearTimeout(timer)
  }, [isNew])

  // Projects are intentionally excluded from the page-level loading gate.
  // ProjectTableSection handles its own loading state so the form can be
  // shown while the GRDM project list is still being fetched in the background.
  const loading = isNew
    ? !formInitialized || !minDelayComplete || userQuery.isLoading
    : dmpQuery.isLoading || userQuery.isLoading || projectQuery.isLoading || !userQuery.data
  const error = dmpQuery.error || userQuery.error || projectQuery.error || projectsQuery.error

  const methods = useForm<DmpFormValues>({
    defaultValues: {
      dmp: initDmp(userQuery.data),
    },
    mode: "onBlur",
    reValidateMode: "onBlur",
  })

  // Initialize form values based on fetched data
  useEffect(() => {
    if (isNew) {
      // Guard with !formInitialized to prevent re-initialization on query refetch,
      // which would overwrite user-entered form values like grdmProjectName.
      if (!formInitialized && userQuery.data) {
        methods.reset({
          dmp: initDmp(userQuery.data),
        })
        setFormInitialized(true)
      }
    } else if (dmpQuery.data && userQuery.data && projectQuery.data) {
      methods.reset({
        dmp: dmpQuery.data,
      })
    }
  }, [formInitialized, isNew, methods, dmpQuery.data, userQuery.data, projectQuery.data])

  // Stable function that reads from the RHF live store at navigation time.
  // methods.formState.isDirty reads from a React-state-backed proxy, which is
  // still stale (true) immediately after reset() because React batches the
  // setState call asynchronously. methods.control._formState is the module-level
  // variable updated synchronously by _setFormState() inside reset(), so it
  // already reflects isDirty=false when navigate() is called right after reset().
  const checkIsDirty = useRef(() => methods.control._formState.isDirty).current
  const blocker = useUnsavedChangesWarning(methods.formState.isDirty, checkIsDirty)

  if (loading) {
    return (
      <Frame noAuth>
        <Loading msg="Loading..." />
      </Frame>
    )
  }

  if (error) throw error

  return (
    <Frame>
      {/* Overlay while GRDM save is in progress. FormCard stays mounted so the
          mutation callbacks (onSuccess → navigate, onError → onSaveEnd) can fire. */}
      <Backdrop open={isSaving} sx={{ zIndex: (t) => t.zIndex.drawer + 1, flexDirection: "column", gap: 2 }}>
        <CircularProgress color="inherit" size={60} />
        <Typography sx={{ color: "white", fontSize: "1.2rem", fontWeight: "bold" }}>
          {t("page.saving")}
        </Typography>
      </Backdrop>
      <FormProvider {...methods}>
        <FormCard
          sx={{ mt: "1.5rem" }}
          isNew={isNew}
          user={userQuery.data!}
          project={projectQuery.data}
          projects={projectsQuery.data ?? []}
          isProjectsLoading={projectsQuery.isLoading}
          onSaveStart={() => setIsSaving(true)}
          onSaveEnd={() => setIsSaving(false)}
        />
      </FormProvider>

      <Dialog open={blocker.state === "blocked"} onClose={() => blocker.reset?.()}>
        <DialogTitle>{t("page.unsavedDialog.title")}</DialogTitle>
        <DialogContent>
          <DialogContentText>
            {t("page.unsavedDialog.description")}
          </DialogContentText>
        </DialogContent>
        <DialogActions>
          <Button onClick={() => blocker.reset?.()} color="primary">
            {t("page.unsavedDialog.stay")}
          </Button>
          <Button onClick={() => blocker.proceed?.()} color="error" autoFocus>
            {t("page.unsavedDialog.leave")}
          </Button>
        </DialogActions>
      </Dialog>
    </Frame>
  )
}
