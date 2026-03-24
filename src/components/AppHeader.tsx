import AccountCircleOutlined from "@mui/icons-material/AccountBalanceOutlined"
import ArrowDropDownOutlined from "@mui/icons-material/ArrowDropDownOutlined"
import Check from "@mui/icons-material/Check"
import FileCopyOutlined from "@mui/icons-material/FileCopyOutlined"
import LogoutOutlined from "@mui/icons-material/LogoutOutlined"
import OpenInNew from "@mui/icons-material/OpenInNew"
import { AppBar, Box, Link, Button, Menu, MenuItem, Select, colors } from "@mui/material"
import { SxProps } from "@mui/system"
import { useQueryClient } from "@tanstack/react-query"
import { useState } from "react"
import { useErrorBoundary } from "react-error-boundary"
import { useTranslation } from "react-i18next"
import { useNavigate } from "react-router-dom"
import { useRecoilState } from "recoil"

import { useSnackbar } from "@/hooks/useSnackbar"
import { useUser } from "@/hooks/useUser"
import { tokenAtom } from "@/store/token"
import { headerColor } from "@/theme"

interface AppHeaderProps {
  sx?: SxProps
  noAuth?: boolean
}

export default function AppHeader({ sx, noAuth }: AppHeaderProps) {
  const navigate = useNavigate()
  const queryClient = useQueryClient()
  const { showBoundary } = useErrorBoundary()
  const userQuery = useUser()
  if (userQuery.isError && userQuery.error) {
    showBoundary(userQuery.error)
  }

  const [token, setToken] = useRecoilState(tokenAtom)
  const [menuAnchorEl, setMenuAnchorEl] = useState<HTMLElement | null>(null)
  const [copied, setCopied] = useState(false)
  const { showSnackbar } = useSnackbar()
  const { t, i18n } = useTranslation("common")

  const handleCopy = () => {
    navigator.clipboard.writeText(token).then(() => {
      setCopied(true)
      setTimeout(() => setCopied(false), 2000)
    })
  }

  const signOut = () => {
    queryClient.clear()
    setToken("")
    showSnackbar(t("header.signedOut"), "info")
    navigate("/")
  }

  const currentLang = i18n.language.startsWith("ja") ? "ja" : "en"

  const menuContent = !noAuth && userQuery.data ? (
    <>
      <Button
        variant="text"
        sx={{
          textTransform: "none",
          color: colors.grey[400],
          "&:hover": { color: "white" },
        }}
        onClick={(e) => setMenuAnchorEl(e.currentTarget)}
      >
        <AccountCircleOutlined sx={{ mr: "0.5rem" }} />
        {userQuery.data.fullName}
        <ArrowDropDownOutlined />
      </Button>
      <Menu
        anchorEl={menuAnchorEl}
        open={Boolean(menuAnchorEl)}
        onClose={() => setMenuAnchorEl(null)}
      >
        <MenuItem
          component="a"
          href={userQuery.data.grdmProfileUrl}
          target="_blank"
          rel="noopener noreferrer"
          sx={{ minWidth: "220px" }}
        >
          <OpenInNew sx={{ mr: "0.5rem" }} />
          {t("header.goToGrdmProfile")}
        </MenuItem>
        <MenuItem onClick={handleCopy} sx={{ minWidth: "220px" }}>
          {copied ? (
            <>
              <Check sx={{ mr: "0.5rem" }} />
              {t("header.copied")}
            </>
          ) : (
            <>
              <FileCopyOutlined sx={{ mr: "0.5rem" }} />
              {t("header.copyAccessToken")}
            </>
          )}
        </MenuItem>
        <MenuItem onClick={signOut} sx={{ minWidth: "220px" }}>
          <LogoutOutlined sx={{ mr: "0.5rem" }} />
          {t("header.signOut")}
        </MenuItem>
      </Menu>
    </>
  ) : null

  return (
    <AppBar
      position="static"
      sx={{
        ...sx,
        height: "4rem",
        display: "flex",
        flexDirection: "row",
        justifyContent: "space-between",
        alignItems: "center",
        bgcolor: headerColor,
        boxShadow: "none",
      }}
    >
      <Box sx={{ ml: "1.5rem" }}>
        <Link
          href="/"
          onClick={(e) => {
            e.preventDefault()
            navigate("/")
          }}
          sx={{
            textDecoration: "none",
            color: colors.grey[300],
            fontSize: "1.75rem",
            letterSpacing: "0.25rem",
          }}
        >
          {"DMP editor"}
        </Link>
      </Box>
      <Box sx={{ mr: "1.5rem", display: "flex", alignItems: "center", gap: "1rem" }}>
        <Select
          value={currentLang}
          onChange={(e) => i18n.changeLanguage(e.target.value)}
          size="small"
          variant="outlined"
          sx={{
            color: colors.grey[300],
            fontSize: "0.85rem",
            height: "2rem",
            "& .MuiOutlinedInput-notchedOutline": { borderColor: colors.grey[600] },
            "&:hover .MuiOutlinedInput-notchedOutline": { borderColor: colors.grey[400] },
            "& .MuiSvgIcon-root": { color: colors.grey[400] },
          }}
        >
          <MenuItem value="ja">{t("language.ja")}</MenuItem>
          <MenuItem value="en">{t("language.en")}</MenuItem>
        </Select>
        {menuContent}
      </Box>
    </AppBar>
  )
}
