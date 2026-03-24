import {
  Box,
  Divider,
  Link,
  Table,
  TableBody,
  TableCell,
  TableContainer,
  TableHead,
  TableRow,
  Typography,
} from "@mui/material"
import { useTranslation } from "react-i18next"
import type { Components } from "react-markdown"
import ReactMarkdown from "react-markdown"
import remarkGfm from "remark-gfm"

import Frame from "@/components/Frame"

// Import manual content at build time via Vite's ?raw import
import enContent from "../../docs/manual/01_manual_en.md?raw"
import jaContent from "../../docs/manual/01_manual_ja.md?raw"

/** Map Markdown elements to MUI components for consistent styling. */
const markdownComponents: Components = {
  h1: ({ children }) => (
    <Typography variant="h4" component="h1" gutterBottom sx={{ mt: "1.5rem" }}>
      {children}
    </Typography>
  ),
  h2: ({ children }) => (
    <Typography variant="h5" component="h2" gutterBottom sx={{ mt: "2rem", mb: "0.5rem" }}>
      {children}
    </Typography>
  ),
  h3: ({ children }) => (
    <Typography variant="h6" component="h3" gutterBottom sx={{ mt: "1.5rem" }}>
      {children}
    </Typography>
  ),
  h4: ({ children }) => (
    <Typography
      variant="subtitle1"
      component="h4"
      fontWeight="bold"
      gutterBottom
      sx={{ mt: "1rem" }}
    >
      {children}
    </Typography>
  ),
  p: ({ children }) => (
    <Typography variant="body1" paragraph>
      {children}
    </Typography>
  ),
  a: ({ href, children }) => (
    <Link href={href ?? "#"} target="_blank" rel="noopener noreferrer">
      {children}
    </Link>
  ),
  hr: () => <Divider sx={{ my: "1.5rem" }} />,
  table: ({ children }) => (
    <TableContainer sx={{ my: "1rem" }}>
      <Table size="small">{children}</Table>
    </TableContainer>
  ),
  thead: ({ children }) => <TableHead>{children}</TableHead>,
  tbody: ({ children }) => <TableBody>{children}</TableBody>,
  tr: ({ children }) => <TableRow>{children}</TableRow>,
  th: ({ children }) => (
    <TableCell
      component="th"
      sx={{ fontWeight: "bold", bgcolor: "grey.100", whiteSpace: "nowrap" }}
    >
      {children}
    </TableCell>
  ),
  td: ({ children }) => <TableCell>{children}</TableCell>,
  code: ({ children, className }) => {
    const isBlock = Boolean(className)
    return isBlock ? (
      <Box
        component="pre"
        sx={{
          bgcolor: "grey.100",
          p: "1rem",
          borderRadius: 1,
          overflow: "auto",
          fontSize: "0.85rem",
          fontFamily: "monospace",
        }}
      >
        <code>{children}</code>
      </Box>
    ) : (
      <Box
        component="code"
        sx={{
          bgcolor: "grey.100",
          px: "0.3rem",
          borderRadius: 0.5,
          fontSize: "0.875em",
          fontFamily: "monospace",
        }}
      >
        {children}
      </Box>
    )
  },
  blockquote: ({ children }) => (
    <Box
      sx={{
        borderLeft: "4px solid",
        borderColor: "primary.main",
        pl: "1rem",
        ml: 0,
        color: "text.secondary",
        my: "1rem",
      }}
    >
      {children}
    </Box>
  ),
  ul: ({ children }) => (
    <Box component="ul" sx={{ pl: "1.5rem", my: "0.5rem" }}>
      {children}
    </Box>
  ),
  ol: ({ children }) => (
    <Box component="ol" sx={{ pl: "1.5rem", my: "0.5rem" }}>
      {children}
    </Box>
  ),
  li: ({ children }) => (
    <Box component="li" sx={{ mb: "0.25rem" }}>
      <Typography variant="body1" component="span">
        {children}
      </Typography>
    </Box>
  ),
}

export default function ManualPage() {
  const { i18n } = useTranslation("common")
  const content = i18n.language.startsWith("en") ? enContent : jaContent

  return (
    <Frame>
      <Box sx={{ py: "2rem" }}>
        <ReactMarkdown remarkPlugins={[remarkGfm]} components={markdownComponents}>
          {content}
        </ReactMarkdown>
      </Box>
    </Frame>
  )
}
