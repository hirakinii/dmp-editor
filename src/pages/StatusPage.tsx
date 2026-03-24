import { Box, Typography, Paper, Button } from "@mui/material"
import { useTranslation } from "react-i18next"
import { useNavigate } from "react-router-dom"

import Frame from "@/components/Frame"
import OurCard from "@/components/OurCard"
import { getErrorChain } from "@/utils"

interface StatusPageProps {
  type: "error" | "notfound"
  error?: Error
  resetErrorBoundary?: () => void
}

export default function StatusPage({
  type,
  error,
  resetErrorBoundary,
}: StatusPageProps) {
  const { t } = useTranslation("status")
  const navigate = useNavigate()
  const isErrorPage = type === "error"

  const title = isErrorPage ? t("error.title") : t("notFound.title")
  const description = isErrorPage ? t("error.description") : t("notFound.description")

  let errorMessage = ""
  let errorStack = ""
  if (isErrorPage && error) {
    const chain = getErrorChain(error)
    errorMessage = chain.map((err) => err.message).join("\n\nCaused by: ")
    errorStack = chain.map((err) => err.stack || err.message).join("\n\nCaused by: ")
  }

  const handleRetry = () => {
    if (isErrorPage && resetErrorBoundary) {
      resetErrorBoundary()
    } else {
      navigate("/")
    }
  }

  const handleClearAndRetry = () => {
    if (isErrorPage && resetErrorBoundary) {
      localStorage.clear()
      resetErrorBoundary()
    }
  }

  return (
    <Frame noAuth>
      <OurCard sx={{ mt: "1.5rem" }}>
        <Typography sx={{ fontSize: "1.5rem" }} component="h1">
          {title}
        </Typography>
        <Typography sx={{ mt: "0.5rem", whiteSpace: "pre-line" }}>
          {description}
        </Typography>
        {isErrorPage && (
          <>
            <Box sx={{ mt: "1.5rem" }}>
              <Typography sx={{ fontWeight: "bold" }}>{t("error.errorMessage")}</Typography>
              <Paper variant="outlined" sx={{ mt: "0.5rem", p: "0.5rem 1rem" }}>
                <Box sx={{ fontFamily: "monospace", overflowX: "auto" }}>
                  <pre>{errorMessage}</pre>
                </Box>
              </Paper>
            </Box>
            <Box sx={{ mt: "1rem" }}>
              <Typography sx={{ fontWeight: "bold" }}>{t("error.stackTrace")}</Typography>
              <Paper variant="outlined" sx={{ mt: "0.5rem", p: "0.5rem 1rem" }}>
                <Box sx={{ fontFamily: "monospace", overflowX: "auto" }}>
                  <pre>{errorStack}</pre>
                </Box>
              </Paper>
            </Box>
          </>
        )}
        <Box sx={{ display: "flex", gap: "1.5rem", mt: "1.5rem" }}>
          <Button variant="contained" color="secondary" onClick={handleRetry}>
            {isErrorPage ? t("error.retry") : t("notFound.backToHome")}
          </Button>
          {isErrorPage && (
            <Button
              variant="contained"
              color="secondary"
              onClick={handleClearAndRetry}
              sx={{ textTransform: "none" }}
            >
              {t("error.clearAndRetry")}
            </Button>
          )}
        </Box>
      </OurCard>
    </Frame>
  )
}
