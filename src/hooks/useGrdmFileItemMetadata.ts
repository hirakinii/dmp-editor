import type { GrdmFileItem, GrdmFileMetadataResponse } from "@hirakinii-packages/grdm-api-typescript"
import { useQuery } from "@tanstack/react-query"
import { useRecoilValue } from "recoil"

import { tokenAtom } from "@/store/token"

// Proxy path configured in vite.config.ts to avoid CORS with the GRDM v1 API.
// The proxy rewrites /grdm-v1-api/* → /api/v1/* on the GRDM host.
const GRDM_V1_PROXY = "/grdm-v1-api"

/**
 * Fetches GRDM file metadata for a specific file by project ID and materialized path.
 * Requests are routed through a local proxy (/grdm-v1-api) to avoid CORS issues
 * with the GRDM v1 API (rdm.nii.ac.jp), which does not set Access-Control-Allow-Origin.
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

      const url = `${GRDM_V1_PROXY}/project/${projectId}/metadata/project`
      const response = await fetch(url, {
        headers: { Authorization: `Bearer ${token}` },
      })
      if (!response.ok) throw new Error(`GRDM v1 API error: ${response.status} ${response.statusText}`)

      const data: GrdmFileMetadataResponse = await response.json() as GrdmFileMetadataResponse
      const files: GrdmFileItem[] = data?.data?.attributes?.files ?? []
      // GrdmFileItem.path has no leading slash (e.g. "osfstorage/file.csv"),
      // while materialized_path from the OSF v2 API includes one (e.g. "/osfstorage/file.csv").
      // Strip the leading slash before comparing.
      const normalizedPath = filePath.startsWith("/") ? filePath.slice(1) : filePath
      return files.find((file) => {
        const sourceFilePath: string = file.path.startsWith("/") ? file.path.slice(1) : file.path
        const providerStrippedFilePath: string = sourceFilePath.startsWith("osfstorage/") ? sourceFilePath.slice(11) : sourceFilePath
        return providerStrippedFilePath === normalizedPath
      },
      ) ?? null
    },
    enabled: false,
  })
}
