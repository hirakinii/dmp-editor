import LockOutlined from "@mui/icons-material/LockOutlined"
import Visibility from "@mui/icons-material/Visibility"
import VisibilityOff from "@mui/icons-material/VisibilityOff"
import {
  Box,
  Button,
  Divider,
  FormControl,
  FormHelperText,
  IconButton,
  InputAdornment,
  InputLabel,
  Link,
  OutlinedInput,
  Typography,
} from "@mui/material"
import { SxProps } from "@mui/system"
import { useState } from "react"
import { useForm, Controller } from "react-hook-form"
import { useTranslation } from "react-i18next"
import { useSetRecoilState } from "recoil"

import tokenEg1Url from "@/assets/token-eg-1.png"
import tokenEg2Url from "@/assets/token-eg-2.png"
import OurCard from "@/components/OurCard"
import { GRDM_CONFIG } from "@/config"
import { authenticateGrdm } from "@/grdmClient"
import { useSnackbar } from "@/hooks/useSnackbar"
import { tokenAtom } from "@/store/token"

export interface LoginCardProps {
  sx?: SxProps
}

interface FormValues {
  token: string
}

export default function LoginCard({ sx }: LoginCardProps) {
  const { t } = useTranslation("home")
  const {
    control,
    handleSubmit,
    setError,
    formState: { errors, isSubmitting },
  } = useForm<FormValues>({
    defaultValues: { token: "" },
  })
  const [showToken, setShowToken] = useState(false)
  const setToken = useSetRecoilState(tokenAtom)
  const { showSnackbar } = useSnackbar()

  const onSubmit = async (data: FormValues) => {
    const { token } = data
    try {
      const result = await authenticateGrdm(token)
      if (result) {
        setToken(token)
        showSnackbar(t("loginCard.authSuccess"), "success")
      } else {
        setError("token", {
          type: "manual",
          message: t("loginCard.authFailed"),
        })
      }
    } catch (e) {
      console.error("Failed to authenticate with GRDM", e)
      setError("token", {
        type: "manual",
        message: t("loginCard.authError"),
      })
    }
  }

  return (
    <OurCard sx={sx}>
      <Typography sx={{ fontSize: "1.5rem" }} component="h1">
        {t("loginCard.title")}
      </Typography>
      <Typography sx={{ mt: "0.5rem" }}>
        {t("loginCard.description1")}
        <br />
        {t("loginCard.description2")}
      </Typography>
      <Box
        component="form"
        onSubmit={handleSubmit(onSubmit)}
        sx={{
          display: "flex",
          flexDirection: "row",
          gap: "1.5rem",
          mt: "1.5rem",
        }}
      >
        <FormControl
          sx={{ flexGrow: 1, maxWidth: "400px" }}
          error={!!errors.token}
        >
          <InputLabel>{t("loginCard.tokenLabel")}</InputLabel>
          <Controller
            name="token"
            control={control}
            rules={{ required: t("loginCard.tokenRequired") }}
            render={({ field }) => (
              <OutlinedInput
                {...field}
                type={showToken ? "text" : "password"}
                label={t("loginCard.tokenLabel")}
                endAdornment={
                  <InputAdornment position="end">
                    <IconButton
                      onClick={() => setShowToken((prev) => !prev)}
                      edge="end"
                    >
                      {showToken ? <Visibility /> : <VisibilityOff />}
                    </IconButton>
                  </InputAdornment>
                }
              />
            )}
          />
          <FormHelperText>{errors.token?.message ?? ""}</FormHelperText>
        </FormControl>
        <Box sx={{ mt: "0.5rem" }}>
          <Button
            type="submit"
            variant="contained"
            sx={{ width: "160px" }}
            color="secondary"
            disabled={isSubmitting}
            startIcon={<LockOutlined />}
          >
            {isSubmitting ? t("loginCard.authenticating") : t("loginCard.authenticate")}
          </Button>
        </Box>
      </Box>
      <Divider sx={{ mt: "1.5rem", mb: "1.5rem" }} />
      <Box sx={{ display: "flex", flexDirection: "column", gap: "1.5rem" }}>
        <Typography>
          {t("loginCard.tokenGuide1")}
          <Link
            href={GRDM_CONFIG.TOKEN_SETTINGS_URL}
            target="_blank"
            rel="noopener noreferrer"
          >
            {GRDM_CONFIG.TOKEN_SETTINGS_URL}
          </Link>
          {t("loginCard.tokenGuide2")}
          <br />
          {t("loginCard.tokenGuide3")}
          <Link
            href={GRDM_CONFIG.SUPPORT_URL}
            target="_blank"
            rel="noopener noreferrer"
          >
            {t("loginCard.tokenGuide4")}
          </Link>
          {t("loginCard.tokenGuide5")}
        </Typography>
        <Box
          component="img"
          src={tokenEg1Url}
          alt="Example of getting token from GakuNin RDM"
          sx={{
            width: "100%",
            maxWidth: "600px",
            display: "block",
            borderRadius: 2,
            boxShadow: "0px 3px 6px rgba(0, 0, 0, 0.2)",
            margin: "auto",
          }}
        />
        <Box
          component="img"
          src={tokenEg2Url}
          alt="Example of getting token from GakuNin RDM"
          sx={{
            width: "100%",
            maxWidth: "600px",
            display: "block",
            borderRadius: 2,
            boxShadow: "0px 3px 6px rgba(0, 0, 0, 0.2)",
            margin: "auto",
          }}
        />
      </Box>
    </OurCard>
  )
}
