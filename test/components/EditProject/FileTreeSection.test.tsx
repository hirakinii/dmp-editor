import { ThemeProvider } from "@mui/material/styles"
import { render, screen, waitFor } from "@testing-library/react"
import userEvent from "@testing-library/user-event"
import { ReactElement, useEffect } from "react"
import { FormProvider, useForm } from "react-hook-form"
import { RecoilRoot } from "recoil"
import { beforeEach, describe, expect, it, vi } from "vitest"

import FileTreeSection from "../../../src/components/EditProject/FileTreeSection"
import type { DmpFormValues } from "../../../src/dmp"
import type { ProjectInfo } from "../../../src/grdmClient"
import { theme } from "../../../src/theme"

vi.mock("@/grdmClient", async (importOriginal) => {
  const mod = await importOriginal<typeof import("@/grdmClient")>()
  return {
    ...mod,
    listingFileNodes: vi.fn().mockResolvedValue({ data: [] }),
  }
})

const mockProjects: ProjectInfo[] = [
  {
    id: "proj-1",
    type: "project",
    title: "Project Alpha",
    description: "",
    category: "",
    dateCreated: "",
    dateModified: "",
    html: "",
    self: "",
  },
  {
    id: "proj-2",
    type: "project",
    title: "Project Beta",
    description: "",
    category: "",
    dateCreated: "",
    dateModified: "",
    html: "",
    self: "",
  },
]

function FileTreeSectionWrapper({
  linkedProjectIds = [],
}: {
  linkedProjectIds?: string[]
}) {
  const methods = useForm<DmpFormValues>({
    defaultValues: {
      dmp: {
        metadata: {
          revisionType: "新規",
          submissionDate: "2024-01-01",
          dateCreated: "2024-01-01",
          dateModified: "2024-01-01",
          researchPhase: "計画時",
        },
        projectInfo: {
          fundingAgency: "",
          programName: "",
          programCode: "",
          projectCode: "",
          projectName: "",
          adoptionYear: "",
          startYear: "",
          endYear: "",
        },
        personInfo: [],
        dataInfo: [],
        linkedGrdmProjects: [],
      },
    },
  })

  // Simulate the linked projects being set after mount (as done by other components in the real app)
  useEffect(() => {
    methods.setValue(
      "dmp.linkedGrdmProjects",
      linkedProjectIds.map((id) => ({ projectId: id })),
    )
  // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [])

  return (
    <FormProvider {...methods}>
      <FileTreeSection projects={mockProjects} />
    </FormProvider>
  )
}

function renderWithProviders(ui: ReactElement) {
  return render(
    <ThemeProvider theme={theme}>
      <RecoilRoot>
        {ui}
      </RecoilRoot>
    </ThemeProvider>,
  )
}

describe("FileTreeSection", () => {
  beforeEach(() => {
    vi.clearAllMocks()
  })

  describe("when no projects are linked", () => {
    it("shows fallback message", () => {
      renderWithProviders(<FileTreeSectionWrapper linkedProjectIds={[]} />)
      expect(screen.getByText("関連付けられた GRDM Project がありません。")).toBeInTheDocument()
    })
  })

  describe("when projects are linked", () => {
    it("renders project names in AccordionSummary", async () => {
      renderWithProviders(<FileTreeSectionWrapper linkedProjectIds={["proj-1", "proj-2"]} />)
      expect(await screen.findByText("Project Alpha")).toBeInTheDocument()
      expect(await screen.findByText("Project Beta")).toBeInTheDocument()
    })

    it("shows project names as accessible accordion summary buttons", async () => {
      renderWithProviders(<FileTreeSectionWrapper linkedProjectIds={["proj-1", "proj-2"]} />)
      const alphaButton = await screen.findByRole("button", { name: /Project Alpha/i })
      const betaButton = await screen.findByRole("button", { name: /Project Beta/i })
      expect(alphaButton).toBeInTheDocument()
      expect(betaButton).toBeInTheDocument()
    })

    it("first accordion is expanded by default", async () => {
      renderWithProviders(<FileTreeSectionWrapper linkedProjectIds={["proj-1", "proj-2"]} />)
      const alphaButton = await screen.findByRole("button", { name: /Project Alpha/i })
      expect(alphaButton).toHaveAttribute("aria-expanded", "true")
    })

    it("second accordion is collapsed by default", async () => {
      renderWithProviders(<FileTreeSectionWrapper linkedProjectIds={["proj-1", "proj-2"]} />)
      const betaButton = await screen.findByRole("button", { name: /Project Beta/i })
      expect(betaButton).toHaveAttribute("aria-expanded", "false")
    })

    it("can expand the second accordion by clicking", async () => {
      const user = userEvent.setup()
      renderWithProviders(<FileTreeSectionWrapper linkedProjectIds={["proj-1", "proj-2"]} />)
      const betaButton = await screen.findByRole("button", { name: /Project Beta/i })
      expect(betaButton).toHaveAttribute("aria-expanded", "false")
      await user.click(betaButton)
      await waitFor(() => {
        expect(betaButton).toHaveAttribute("aria-expanded", "true")
      })
    })

    it("can collapse the first accordion by clicking", async () => {
      const user = userEvent.setup()
      renderWithProviders(<FileTreeSectionWrapper linkedProjectIds={["proj-1", "proj-2"]} />)
      const alphaButton = await screen.findByRole("button", { name: /Project Alpha/i })
      expect(alphaButton).toHaveAttribute("aria-expanded", "true")
      await user.click(alphaButton)
      await waitFor(() => {
        expect(alphaButton).toHaveAttribute("aria-expanded", "false")
      })
    })
  })
})
