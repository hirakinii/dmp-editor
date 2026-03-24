import "@/i18n"
import CssBaseline from "@mui/material/CssBaseline"
import { ThemeProvider } from "@mui/material/styles"
import { QueryClientProvider } from "@tanstack/react-query"
import { ErrorBoundary } from "react-error-boundary"
import { createBrowserRouter, RouterProvider, Outlet } from "react-router"
import { RecoilRoot } from "recoil"

import AuthHelper from "@/components/AuthHelper"
import SnackbarProvider from "@/components/SnackbarProvider"
import DetailProject from "@/pages/DetailProject"
import EditProject from "@/pages/EditProject"
import Home from "@/pages/Home"
import StatusPage from "@/pages/StatusPage"
import { queryClient } from "@/queryClient"
import theme from "@/theme"

function RootLayout() {
  return (
    <ErrorBoundary
      fallbackRender={({ error, resetErrorBoundary }) => (
        <StatusPage type="error" error={error} resetErrorBoundary={resetErrorBoundary} />
      )}
      onReset={() => window.location.reload()}
    >
      <AuthHelper>
        <Outlet />
      </AuthHelper>
    </ErrorBoundary>
  )
}

const router = createBrowserRouter(
  [
    {
      path: "/",
      element: <RootLayout />,
      children: [
        { index: true, element: <Home /> },
        { path: "projects/new", element: <EditProject isNew /> },
        { path: "projects/:projectId/detail", element: <DetailProject /> },
        { path: "projects/:projectId", element: <EditProject /> },
        { path: "*", element: <StatusPage type="notfound" /> },
      ],
    },
  ],
  { basename: DMP_EDITOR_BASE },
)

export default function App() {
  return (
    <ThemeProvider theme={theme}>
      <CssBaseline />
      <RecoilRoot>
        <QueryClientProvider client={queryClient}>
          <SnackbarProvider>
            <RouterProvider router={router} />
          </SnackbarProvider>
        </QueryClientProvider>
      </RecoilRoot>
    </ThemeProvider>
  )
}
