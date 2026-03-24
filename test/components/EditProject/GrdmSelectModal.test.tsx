import { ThemeProvider } from "@mui/material/styles"
import { render, screen, waitFor } from "@testing-library/react"
import userEvent from "@testing-library/user-event"
import { ReactElement } from "react"
import { RecoilRoot } from "recoil"
import { describe, expect, it, vi, beforeEach } from "vitest"

import GrdmSelectModal from "../../../src/components/EditProject/GrdmSelectModal"
import type { LinkedGrdmFile } from "../../../src/dmp"
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

describe("GrdmSelectModal", () => {
  beforeEach(() => {
    vi.clearAllMocks()
  })

  it("renders the modal title when open", () => {
    renderWithProviders(
      <GrdmSelectModal
        open={true}
        onClose={vi.fn()}
        projects={mockProjects}
        linkedProjectIds={["proj-1"]}
        linkedFiles={[]}
        onLinkedFilesChange={vi.fn()}
      />,
    )
    expect(screen.getByText("GRDMからデータを選択")).toBeInTheDocument()
  })

  it("does not render modal content when closed", () => {
    renderWithProviders(
      <GrdmSelectModal
        open={false}
        onClose={vi.fn()}
        projects={mockProjects}
        linkedProjectIds={["proj-1"]}
        linkedFiles={[]}
        onLinkedFilesChange={vi.fn()}
      />,
    )
    expect(screen.queryByText("GRDMからデータを選択")).not.toBeInTheDocument()
  })

  it("shows linked file count chip", () => {
    const linkedFiles: LinkedGrdmFile[] = [
      {
        projectId: "proj-1",
        nodeId: "file-1",
        label: "test.txt",
        type: "file",
        size: 1024,
        materialized_path: "/test.txt",
        last_touched: null,
        date_modified: null,
        date_created: null,
        hash_md5: null,
        hash_sha256: null,
      },
    ]
    renderWithProviders(
      <GrdmSelectModal
        open={true}
        onClose={vi.fn()}
        projects={mockProjects}
        linkedProjectIds={["proj-1"]}
        linkedFiles={linkedFiles}
        onLinkedFilesChange={vi.fn()}
      />,
    )
    expect(screen.getByText("リンク済み: 1 ファイル")).toBeInTheDocument()
  })

  it("calls onClose when Close button is clicked", async () => {
    const user = userEvent.setup()
    const onClose = vi.fn()
    renderWithProviders(
      <GrdmSelectModal
        open={true}
        onClose={onClose}
        projects={mockProjects}
        linkedProjectIds={["proj-1"]}
        linkedFiles={[]}
        onLinkedFilesChange={vi.fn()}
      />,
    )
    await user.click(screen.getByRole("button", { name: "閉じる" }))
    expect(onClose).toHaveBeenCalledOnce()
  })

  it("calls onLinkedFilesChange with the file added when a file link button is clicked", async () => {
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

    const onLinkedFilesChange = vi.fn()
    renderWithProviders(
      <GrdmSelectModal
        open={true}
        onClose={vi.fn()}
        projects={mockProjects}
        linkedProjectIds={["proj-1"]}
        linkedFiles={[]}
        onLinkedFilesChange={onLinkedFilesChange}
      />,
    )

    // Wait for the file node to appear and click "関連付ける" (link)
    const linkButton = await screen.findByRole("button", { name: "関連付ける" })
    await userEvent.click(linkButton)

    await waitFor(() => {
      expect(onLinkedFilesChange).toHaveBeenCalledWith(
        expect.arrayContaining([
          expect.objectContaining({ nodeId: "file-1", type: "file" }),
        ]),
      )
    })
  })

  it("calls onLinkedFilesChange with the file removed when unlink button is clicked", async () => {
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

    const linkedFiles: LinkedGrdmFile[] = [
      {
        projectId: "proj-1",
        nodeId: "file-1",
        label: "test.txt",
        type: "file",
        size: 1024,
        materialized_path: "/test.txt",
        last_touched: null,
        date_modified: null,
        date_created: null,
        hash_md5: null,
        hash_sha256: null,
      },
    ]

    const onLinkedFilesChange = vi.fn()
    renderWithProviders(
      <GrdmSelectModal
        open={true}
        onClose={vi.fn()}
        projects={mockProjects}
        linkedProjectIds={["proj-1"]}
        linkedFiles={linkedFiles}
        onLinkedFilesChange={onLinkedFilesChange}
      />,
    )

    // The file is already linked, so "関連付け解除" button should be shown
    const unlinkButton = await screen.findByRole("button", { name: "関連付け解除" })
    await userEvent.click(unlinkButton)

    await waitFor(() => {
      expect(onLinkedFilesChange).toHaveBeenCalledWith([])
    })
  })
})
