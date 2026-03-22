import { useMutation, useQueryClient } from "@tanstack/react-query"
import { useRecoilValue } from "recoil"

import type { DmpFormValues } from "@/dmp"
import { createProject, updateProjectTitle, writeDmpFile, DMP_PROJECT_PREFIX } from "@/grdmClient"
import { tokenAtom } from "@/store/token"

/** Thrown when the GRDM project was renamed successfully but the DMP file write failed. */
export class PartialSaveError extends Error {
  constructor(cause: unknown) {
    super("DMP file write failed after project rename")
    this.name = "PartialSaveError"
    this.cause = cause
  }
}

export interface UpdateDmpArgs {
  projectId: string
  isNew?: boolean
  formValues: DmpFormValues
  /** Current GRDM project title; used to detect whether a rename is needed. */
  currentProjectTitle?: string
}

/**
 * Custom hook to update the Data Management Plan (DMP) for a GRDM project.
 * When editing an existing project and the research name changed, renames the
 * GRDM project to `DMP-{newName}` before writing the DMP file.
 */
export function useUpdateDmp() {
  const token = useRecoilValue(tokenAtom)
  const queryClient = useQueryClient()

  return useMutation({
    mutationFn: async (
      { projectId, isNew = false, formValues, currentProjectTitle }: UpdateDmpArgs,
    ): Promise<string> => {
      const id = isNew
        ? (await createProject(token, `${DMP_PROJECT_PREFIX}${formValues.dmp.projectInfo.projectName}`)).id
        : projectId

      const expectedTitle = `${DMP_PROJECT_PREFIX}${formValues.dmp.projectInfo.projectName}`
      const wasRenamed = !isNew && !!currentProjectTitle && currentProjectTitle !== expectedTitle
      if (wasRenamed) {
        await updateProjectTitle(token, id, expectedTitle)
      }

      try {
        await writeDmpFile(token, id, formValues.dmp)
      } catch (error) {
        if (wasRenamed) throw new PartialSaveError(error)
        throw error
      }

      queryClient.invalidateQueries({ queryKey: ["dmp", token, id] })

      return id
    },
  })
}

