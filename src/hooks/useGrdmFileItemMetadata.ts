import { GrdmClient } from "@hirakinii-packages/grdm-api-typescript"
import type { GrdmFileItem } from "@hirakinii-packages/grdm-api-typescript"
import { useQuery } from "@tanstack/react-query"
import { useRecoilValue } from "recoil"

import { GRDM_CONFIG } from "@/config"
import { tokenAtom } from "@/store/token"

/**
 * Fetches GRDM file metadata for a specific file by project ID and materialized path.
 * Fetching is on-demand: call refetch() to trigger instead of auto-fetching.
 */
export const useGrdmFileItemMetadata = (
  projectId: string | null | undefined,
  filePath: string | null | undefined,
) => {
  const token = useRecoilValue(tokenAtom)

  return useQuery<GrdmFileItem | null, Error>({
    queryKey: ["fileItemMetadata", token, projectId, filePath],
    queryFn: async () => {
      if (!projectId || !filePath) return null
      const client = new GrdmClient({ token, baseUrl: `${GRDM_CONFIG.API_BASE_URL}/` })
      const result = await client.fileMetadata.findFileByPath(projectId, filePath)
      return result ?? null
    },
    enabled: false,
  })
}
