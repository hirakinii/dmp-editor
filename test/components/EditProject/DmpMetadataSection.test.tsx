import { ThemeProvider } from "@mui/material/styles"
import { render, screen, waitFor } from "@testing-library/react"
import userEvent from "@testing-library/user-event"
import { FormProvider, useForm } from "react-hook-form"
import { describe, expect, it } from "vitest"

import DmpMetadataSection from "../../../src/components/EditProject/DmpMetadataSection"
import { initDmp } from "../../../src/dmp"
import type { DmpFormValues, DmpMetadata } from "../../../src/dmp"
import { theme } from "../../../src/theme"

// --- Helpers ---

interface WrapperProps {
  isNew?: boolean
  metadata?: Partial<DmpMetadata>
}

/**
 * Renders DmpMetadataSection inside a FormProvider.
 * Exposes a "Validate" button that triggers submissionDate validation,
 * useful for testing error messages without submitting a full form.
 */
function TestWrapper({ isNew = false, metadata }: WrapperProps) {
  const dmp = initDmp()
  const methods = useForm<DmpFormValues>({
    defaultValues: {
      grdmProjectName: "",
      dmp: { ...dmp, metadata: { ...dmp.metadata, ...metadata } },
    },
    mode: "onBlur",
    reValidateMode: "onBlur",
  })
  return (
    <ThemeProvider theme={theme}>
      <FormProvider {...methods}>
        <DmpMetadataSection isNew={isNew} />
        <button type="button" onClick={() => methods.trigger("dmp.metadata.submissionDate")}>
          Validate
        </button>
      </FormProvider>
    </ThemeProvider>
  )
}

function renderDmpMetadataSection(props: WrapperProps = {}) {
  return render(<TestWrapper {...props} />)
}

// --- Tests ---

describe("DmpMetadataSection", () => {
  describe("revisionType field disabled state", () => {
    it("disables revisionType select when isNew=true", () => {
      renderDmpMetadataSection({ isNew: true })
      // MUI Select renders a hidden input for form value; it is disabled when the Select is disabled
      const input = document.querySelector(
        "input[name=\"dmp.metadata.revisionType\"]",
      ) as HTMLInputElement | null
      expect(input).not.toBeNull()
      expect(input).toBeDisabled()
    })

    it("enables revisionType select when isNew=false", () => {
      renderDmpMetadataSection({ isNew: false })
      const input = document.querySelector(
        "input[name=\"dmp.metadata.revisionType\"]",
      ) as HTMLInputElement | null
      expect(input).not.toBeNull()
      expect(input).not.toBeDisabled()
    })
  })

  describe("submissionDate validation", () => {
    it("passes validation when submissionDate equals dateCreated (同日 OK)", async () => {
      const user = userEvent.setup()
      renderDmpMetadataSection({
        metadata: {
          dateCreated: "2024-01-10",
          submissionDate: "2024-01-10",
        },
      })

      await user.click(screen.getByRole("button", { name: "Validate" }))

      await waitFor(() => {
        expect(
          screen.queryByText(/以降の日付を入力してください/),
        ).not.toBeInTheDocument()
      })
    })

    it("passes validation when submissionDate is after dateCreated", async () => {
      const user = userEvent.setup()
      renderDmpMetadataSection({
        metadata: {
          dateCreated: "2024-01-10",
          submissionDate: "2024-01-11",
        },
      })

      await user.click(screen.getByRole("button", { name: "Validate" }))

      await waitFor(() => {
        expect(
          screen.queryByText(/以降の日付を入力してください/),
        ).not.toBeInTheDocument()
      })
    })

    it("fails validation when submissionDate is before dateCreated", async () => {
      const user = userEvent.setup()
      renderDmpMetadataSection({
        metadata: {
          dateCreated: "2024-01-10",
          submissionDate: "2024-01-09",
        },
      })

      await user.click(screen.getByRole("button", { name: "Validate" }))

      await waitFor(() => {
        expect(
          screen.getByText("提出日は DMP 作成年月日以降の日付を入力してください"),
        ).toBeInTheDocument()
      })
    })
  })
})
