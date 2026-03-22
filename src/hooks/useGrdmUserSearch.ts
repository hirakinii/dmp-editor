import { GrdmClient } from "@hirakinii-packages/grdm-api-typescript"
import { useQuery } from "@tanstack/react-query"
import type { OsfUserAttributes, TransformedResource } from "osf-api-v2-typescript"
import { useState } from "react"
import { useRecoilValue } from "recoil"

import { GRDM_CONFIG } from "@/config"
import { tokenAtom } from "@/store/token"

export interface GrdmUserSearchResult {
  id: string
  familyName: string
  givenName: string
  orcid: string | null
  affiliation: string | null
}

/**
 * Converts a TransformedResource<OsfUserAttributes> to GrdmUserSearchResult.
 */
export function toGrdmUserSearchResult(
  user: TransformedResource<OsfUserAttributes>,
): GrdmUserSearchResult {
  const social = user.social as Record<string, string> | undefined
  const orcid = social?.orcid ?? null
  const employment = user.employment
  const affiliation = employment && employment.length > 0 ? employment[0].institution : null

  return {
    id: user.id,
    familyName: user.family_name,
    givenName: user.given_name,
    orcid,
    affiliation,
  }
}

/**
 * Custom hook for searching GRDM users by family name.
 * Uses `enabled: false` so the query only runs when `search()` is called manually.
 *
 * @returns familyName state, setFamilyName setter, users result, isFetching flag, and search trigger
 */
export function useGrdmUserSearch() {
  const token = useRecoilValue(tokenAtom)
  const [familyName, setFamilyName] = useState("")

  const { data, isFetching, refetch } = useQuery<GrdmUserSearchResult[], Error>({
    queryKey: ["grdmUsers", familyName],
    queryFn: async () => {
      const client = new GrdmClient({ token, baseUrl: `${GRDM_CONFIG.API_BASE_URL}/` })
      const result = await client.users.listUsers({ "filter[family_name]": familyName })
      return result.data.map(toGrdmUserSearchResult)
    },
    enabled: false,
  })

  return {
    familyName,
    setFamilyName,
    users: data ?? [],
    isFetching,
    search: refetch,
  }
}
