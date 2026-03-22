import react from "@vitejs/plugin-react-swc"
import path from "path"
import { defineConfig } from "vite"

// https://vite.dev/config/
// GRDM v1 API target depends on whether dev environment is selected
const grdmV1Target =
  process.env.VITE_USE_GRDM_DEV_ENV === "true"
    ? "https://rcos.rdm.nii.ac.jp"
    : "https://rdm.nii.ac.jp"

export default defineConfig({
  plugins: [react()],
  root: "./src",
  envDir: "../",
  resolve: {
    alias: {
      "@": path.resolve(__dirname, "src"),
    },
  },
  build: {
    outDir: "../dist",
    rollupOptions: {
      output: {
        manualChunks: {
          "vendor-react": ["react", "react-dom", "react-error-boundary", "react-hook-form"],
          "vendor-router": ["react-router", "react-router-dom"],
          "vendor-mui": [
            "@mui/material",
            "@mui/icons-material",
            "@mui/x-tree-view",
            "@emotion/react",
            "@emotion/styled",
          ],
          "vendor-query": ["@tanstack/react-query", "@tanstack/react-query-devtools"],
          "vendor-state": ["recoil"],
        },
      },
    },
  },
  server: {
    host: process.env.DMP_EDITOR_HOST || "0.0.0.0",
    port: parseInt(process.env.DMP_EDITOR_PORT || "3000"),
    proxy: {
      "/kaken-api": {
        target: "https://kaken.nii.ac.jp",
        changeOrigin: true,
        rewrite: (p) => p.replace(/^\/kaken-api/, ""),
      },
      "/nrid-api": {
        target: "https://nrid.nii.ac.jp",
        changeOrigin: true,
        rewrite: (p) => p.replace(/^\/nrid-api/, ""),
      },
      "/ror-api": {
        target: "https://api.ror.org",
        changeOrigin: true,
        rewrite: (p) => p.replace(/^\/ror-api/, "/organizations"),
      },
      // GRDM v1 API proxy to avoid CORS (v1 API does not set Access-Control-Allow-Origin)
      "/grdm-v1-api": {
        target: grdmV1Target,
        changeOrigin: true,
        rewrite: (p) => p.replace(/^\/grdm-v1-api/, "/api/v1"),
      },
    },
  },
  preview: {
    host: process.env.DMP_EDITOR_HOST || "0.0.0.0",
    port: parseInt(process.env.DMP_EDITOR_PORT || "3000"),
    proxy: {
      "/kaken-api": {
        target: "https://kaken.nii.ac.jp",
        changeOrigin: true,
        rewrite: (p) => p.replace(/^\/kaken-api/, ""),
      },
      "/nrid-api": {
        target: "https://nrid.nii.ac.jp",
        changeOrigin: true,
        rewrite: (p) => p.replace(/^\/nrid-api/, ""),
      },
      "/ror-api": {
        target: "https://api.ror.org",
        changeOrigin: true,
        rewrite: (p) => p.replace(/^\/ror-api/, "/organizations"),
      },
      // GRDM v1 API proxy to avoid CORS (v1 API does not set Access-Control-Allow-Origin)
      "/grdm-v1-api": {
        target: grdmV1Target,
        changeOrigin: true,
        rewrite: (p) => p.replace(/^\/grdm-v1-api/, "/api/v1"),
      },
    },
  },
  define: {
    __APP_VERSION__: JSON.stringify(process.env.npm_package_version || "0.0.0"),
    DMP_EDITOR_BASE: JSON.stringify(process.env.DMP_EDITOR_BASE || "/"),
    VITE_USE_GRDM_DEV_ENV: JSON.stringify(process.env.VITE_USE_GRDM_DEV_ENV || "false"),
    VITE_KAKEN_APP_ID: JSON.stringify(process.env.VITE_KAKEN_APP_ID ?? ""),
  },
  base: process.env.DMP_EDITOR_BASE || "/",
})
