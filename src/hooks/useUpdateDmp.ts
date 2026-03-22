import { useMutation, useQueryClient } from "@tanstack/react-query"
import { useRecoilValue } from "recoil"

import type { DmpFormValues } from "@/dmp"
import { createProject, writeDmpFile, DMP_PROJECT_PREFIX } from "@/grdmClient"
import { tokenAtom } from "@/store/token"

export interface UpdateDmpArgs {
  projectId: string
  isNew?: boolean
  formValues: DmpFormValues
}

/**
 * Custom hook to update the Data Management Plan (DMP) for a GRDM project.
 */
export function useUpdateDmp() {
  const token = useRecoilValue(tokenAtom)
  const queryClient = useQueryClient()

  return useMutation({
    mutationFn: async (
      { projectId, isNew = false, formValues }: UpdateDmpArgs,
    ): Promise<string> => {
      const id = isNew
        ? (await createProject(token, `${DMP_PROJECT_PREFIX}${formValues.dmp.projectInfo.projectName}`)).id
        : projectId

      await writeDmpFile(token, id, formValues.dmp)

      queryClient.invalidateQueries({ queryKey: ["dmp", token, id] })

      return id
    },
  })
}

