import { KakenApiClient } from "@hirakinii-packages/kaken-api-client-typescript"
import type { Project } from "@hirakinii-packages/kaken-api-client-typescript"
import { useQuery } from "@tanstack/react-query"

import type { ProjectInfo } from "@/dmp"

/**
 * Maps a KAKEN API Project object to a DMP ProjectInfo object.
 * @param project - KAKEN Project data
 * @returns Partial DMP ProjectInfo mapped from the KAKEN project
 */
export function kakenProjectToDmpProjectInfo(project: Project): ProjectInfo {
  const period = project.periodOfAward

  // Map recordSet to funding agency, program name, and program code
  const isKakenhi = project.recordSet === "kakenhi"
  const fundingAgency = isKakenhi ? "日本学術振興会" : ""
  const programName = isKakenhi ? "科学研究費助成事業" : ""
  const programCode = isKakenhi ? "JP" : ""

  // Derive projectCode from nationalAwardNumber identifier, or fall back to programCode + awardNumber
  const nationalAwardNumber = project.identifiers?.find(
    (id) => id.type === "nationalAwardNumber",
  )?.value
  const projectCode = nationalAwardNumber ?? programCode + (project.awardNumber ?? "")

  // Derive adoptionYear from the created date
  const adoptionYear = project.created != null ? String(project.created.getFullYear()) : ""

  return {
    fundingAgency,
    programName,
    programCode,
    projectCode,
    projectName: project.title ?? "",
    adoptionYear,
    startYear:
      period?.searchStartFiscalYear != null ? String(period.searchStartFiscalYear) : "",
    endYear: period?.searchEndFiscalYear != null ? String(period.searchEndFiscalYear) : "",
  }
}

/**
 * Fetch function that rewrites KAKEN/NRID API URLs to local proxy paths,
 * avoiding CORS issues when called from a browser environment.
 * Corresponds to the proxy rules configured in vite.config.ts.
 */
const kakenProxyFetch = (url: string): Promise<Response> =>
  fetch(
    url
      .replace("https://kaken.nii.ac.jp", "/kaken-api")
      .replace("https://nrid.nii.ac.jp", "/nrid-api"),
  )

/**
 * Custom hook for searching KAKEN projects by project number and mapping them to DMP ProjectInfo.
 * Uses `enabled: false` so the query only runs when `refetch()` is called manually.
 * File-based caching is disabled (`useCache: false`) since it is not available in browser environments.
 * Requests are routed through a local proxy (`/kaken-api`) to avoid CORS issues.
 * @param kakenNumber - KAKEN project number (e.g. "23K12345")
 */
export function useKakenProject(kakenNumber: string) {
  return useQuery<ProjectInfo | null, Error>({
    queryKey: ["kakenProject", kakenNumber],
    queryFn: async () => {
      const client = new KakenApiClient({
        useCache: false,
        appId: import.meta.env.VITE_KAKEN_APP_ID || undefined,
        fetchFn: kakenProxyFetch,
      })
      const response = await client.projects.search({ projectNumber: kakenNumber })
      const project = response.projects[0]
      if (!project) return null
      return kakenProjectToDmpProjectInfo(project)
    },
    enabled: false,
  })
}
