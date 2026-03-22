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

  const loading = isNew
    ? !formInitialized || !minDelayComplete || userQuery.isLoading || projectsQuery.isLoading
    : dmpQuery.isLoading ||
      userQuery.isLoading ||
      projectQuery.isLoading ||
      projectsQuery.isLoading ||
      !userQuery.data ||
      !projectsQuery.data
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
      if (!formInitialized && userQuery.data && projectsQuery.data) {
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
  }, [formInitialized, isNew, methods, dmpQuery.data, userQuery.data, projectQuery.data, projectsQuery.data])

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
          {"GRDMに保存中..."}
        </Typography>
      </Backdrop>
      <FormProvider {...methods}>
        <FormCard
          sx={{ mt: "1.5rem" }}
          isNew={isNew}
          user={userQuery.data!}
          project={projectQuery.data}
          projects={projectsQuery.data!}
          onSaveStart={() => setIsSaving(true)}
          onSaveEnd={() => setIsSaving(false)}
        />
      </FormProvider>

      <Dialog open={blocker.state === "blocked"} onClose={() => blocker.reset?.()}>
        <DialogTitle>{"未保存の変更があります"}</DialogTitle>
        <DialogContent>
          <DialogContentText>
            {"保存せずにページを離れると、変更内容が失われます。続けますか？"}
          </DialogContentText>
        </DialogContent>
        <DialogActions>
          <Button onClick={() => blocker.reset?.()} color="primary">
            {"このページに留まる"}
          </Button>
          <Button onClick={() => blocker.proceed?.()} color="error" autoFocus>
            {"変更を破棄して離れる"}
          </Button>
        </DialogActions>
      </Dialog>
    </Frame>
  )
}
