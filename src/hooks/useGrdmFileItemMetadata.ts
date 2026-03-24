import type { GrdmFileItem, GrdmFileMetadataResponse } from "@hirakinii-packages/grdm-api-typescript"
import { useQuery } from "@tanstack/react-query"
import { useRecoilValue } from "recoil"

import { tokenAtom } from "@/store/token"

// Proxy path configured in vite.config.ts to avoid CORS with the GRDM v1 API.
// The proxy rewrites /grdm-v1-api/* → /api/v1/* on the GRDM host.
const GRDM_V1_PROXY = "/grdm-v1-api"

/**
 * Strips the storage provider prefix (e.g. "osfstorage/", "googledrive/") from a
 * GrdmFileItem path, returning the path relative to the provider root.
 * If no slash is present the original string is returned unchanged.
 */
export const stripProviderPrefix = (path: string): string => {
  const slashIndex = path.indexOf("/")
  return slashIndex !== -1 ? path.slice(slashIndex + 1) : path
}

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
      console.log(files)
      // GrdmFileItem.path has no leading slash (e.g. "osfstorage/file.csv"),
      // while materialized_path from the OSF v2 API includes one (e.g. "/osfstorage/file.csv").
      // Strip the leading slash before comparing.
      const normalizedPath = filePath.startsWith("/") ? filePath.slice(1) : filePath
      return files.find((file) => {
        const sourceFilePath: string = file.path.startsWith("/") ? file.path.slice(1) : file.path
        const providerStrippedFilePath: string = stripProviderPrefix(sourceFilePath)
        return providerStrippedFilePath === normalizedPath
      },
      ) ?? null
    },
    enabled: false,
  })
}
