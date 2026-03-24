import { ThemeProvider } from "@mui/material/styles"
import { render, screen, waitFor } from "@testing-library/react"
import userEvent from "@testing-library/user-event"
import { ReactElement } from "react"
import { RecoilRoot } from "recoil"
import { describe, expect, it, vi, beforeEach } from "vitest"

import GrdmFileTreeView from "../../../src/components/EditProject/GrdmFileTreeView"
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

function renderWithProviders(ui: ReactElement) {
  return render(
    <ThemeProvider theme={theme}>
      <RecoilRoot>
        {ui}
      </RecoilRoot>
    </ThemeProvider>,
  )
}

describe("GrdmFileTreeView", () => {
  beforeEach(() => {
    vi.clearAllMocks()
  })

  describe("when no projects are linked", () => {
    it("shows fallback message", () => {
      renderWithProviders(
        <GrdmFileTreeView
          projects={mockProjects}
          linkedProjectIds={[]}
          renderNodeActions={() => null}
        />,
      )
      expect(screen.getByText("関連付けられた GRDM Project がありません。")).toBeInTheDocument()
    })
  })

  describe("when projects are linked", () => {
    it("renders project names in accordion summaries", async () => {
      renderWithProviders(
        <GrdmFileTreeView
          projects={mockProjects}
          linkedProjectIds={["proj-1", "proj-2"]}
          renderNodeActions={() => null}
        />,
      )
      expect(await screen.findByText("Project Alpha")).toBeInTheDocument()
      expect(await screen.findByText("Project Beta")).toBeInTheDocument()
    })

    it("first accordion is expanded by default", async () => {
      renderWithProviders(
        <GrdmFileTreeView
          projects={mockProjects}
          linkedProjectIds={["proj-1", "proj-2"]}
          renderNodeActions={() => null}
        />,
      )
      const alphaButton = await screen.findByRole("button", { name: /Project Alpha/i })
      expect(alphaButton).toHaveAttribute("aria-expanded", "true")
    })

    it("second accordion is collapsed by default", async () => {
      renderWithProviders(
        <GrdmFileTreeView
          projects={mockProjects}
          linkedProjectIds={["proj-1", "proj-2"]}
          renderNodeActions={() => null}
        />,
      )
      const betaButton = await screen.findByRole("button", { name: /Project Beta/i })
      expect(betaButton).toHaveAttribute("aria-expanded", "false")
    })

    it("can expand the second accordion by clicking", async () => {
      const user = userEvent.setup()
      renderWithProviders(
        <GrdmFileTreeView
          projects={mockProjects}
          linkedProjectIds={["proj-1", "proj-2"]}
          renderNodeActions={() => null}
        />,
      )
      const betaButton = await screen.findByRole("button", { name: /Project Beta/i })
      await user.click(betaButton)
      await waitFor(() => {
        expect(betaButton).toHaveAttribute("aria-expanded", "true")
      })
    })

    it("calls renderNodeActions for file nodes", async () => {
      const { listingFileNodes } = await import("@/grdmClient")
      vi.mocked(listingFileNodes).mockResolvedValueOnce({
        data: [
          {
            id: "file-1",
            attributes: {
              kind: "file",
              materialized_path: "/test.txt",
              size: 1024,
              last_touched: null,
              date_modified: null,
              date_created: null,
              extra: { hashes: {} },
            },
            links: { download: undefined },
          },
        ],
      } as never)

      const renderNodeActions = vi.fn(() => <button>Custom Action</button>)

      renderWithProviders(
        <GrdmFileTreeView
          projects={mockProjects}
          linkedProjectIds={["proj-1"]}
          renderNodeActions={renderNodeActions}
        />,
      )

      await waitFor(() => {
        expect(screen.getByText("Custom Action")).toBeInTheDocument()
      })
      expect(renderNodeActions).toHaveBeenCalledWith(
        expect.objectContaining({ type: "file", nodeId: "file-1" }),
        expect.any(Set),
        expect.any(Function),
      )
    })
  })
})
