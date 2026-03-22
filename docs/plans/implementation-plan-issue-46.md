# Implementation Plan #46: ProjectTableSection — Search Bar + Lazy-Load Infinite Scroll

## Overview

Refactor `src/components/EditProject/ProjectTableSection.tsx` to:
1. Add a project-name search bar above the table.
2. Introduce **infinite scroll** (lazy load) — initially render 10 rows; as the user
   scrolls to the bottom, another 10 rows are appended.
3. Show a **gradient overlay** at the bottom of the scrollable table while more rows
   remain, so users can understand there is more content below.

---

## State Design

| State variable | Type | Initial value | Purpose |
|---|---|---|---|
| `searchQuery` | `string` | `""` | Text entered in the search bar |
| `displayCount` | `number` | `10` | Number of rows currently rendered |

### Derived values

```ts
// 1. Filter out DMP-prefixed projects (existing logic)
const filtered = projects.filter((p) => !p.title.startsWith(DMP_PROJECT_PREFIX))

// 2. Apply search query
const searchFiltered = filtered.filter((p) =>
  p.title.toLowerCase().includes(searchQuery.toLowerCase())
)

// 3. Slice to current display count (lazy load window)
const displayedProjects = searchFiltered.slice(0, displayCount)

// 4. Whether a next batch exists
const hasMore = displayCount < searchFiltered.length
```

When `searchQuery` changes → reset `displayCount` to `10`.

---

## Infinite Scroll Mechanism

Use the native `IntersectionObserver` API on a **sentinel row** placed at the
bottom of `<TableBody>`.

```
<TableBody>
  {displayedProjects.map(...)}   ← visible rows

  {hasMore && (
    <TableRow ref={sentinelRef}> ← invisible sentinel
      <TableCell colSpan={4}>
        <CircularProgress />     ← loading indicator
      </TableCell>
    </TableRow>
  )}
</TableBody>
```

### Observer setup (in `useEffect`)

```ts
useEffect(() => {
  if (!sentinelRef.current || !hasMore) return
  const observer = new IntersectionObserver(
    ([entry]) => {
      if (entry.isIntersecting) setDisplayCount((c) => c + 10)
    },
    { threshold: 0.1 },
  )
  observer.observe(sentinelRef.current)
  return () => observer.disconnect()
}, [hasMore, displayCount])  // re-subscribe after each batch load
```

---

## Gradient Overlay (Visual Cue)

Wrap `<TableContainer>` in a relative `<Box>`. When `hasMore` is true, render an
absolutely positioned gradient `<Box>` that overlays the bottom edge of the
scroll container. The gradient fades from transparent → white and has
`pointerEvents: "none"` so it does not block clicks.

```
<Box sx={{ position: "relative" }}>
  <TableContainer sx={{ maxHeight: "530px", overflow: "auto", ... }}>
    ...
  </TableContainer>

  {hasMore && (
    <Box sx={{
      position: "absolute",
      bottom: 0, left: 0, right: 0,
      height: "64px",
      background: "linear-gradient(transparent, white)",
      pointerEvents: "none",
      borderRadius: "0 0 4px 4px",
    }} />
  )}
</Box>
```

The gradient sits **inside** the wrapper but **outside** the scrollable container,
so it stays pinned to the visible bottom edge while the table scrolls beneath it.

---

## Search Bar

Placed between the description `<Typography>` and the table wrapper.

```tsx
<TextField
  size="small"
  placeholder="プロジェクト名で検索"
  value={searchQuery}
  onChange={(e) => {
    setSearchQuery(e.target.value)
    setDisplayCount(10)          // reset lazy-load window on new search
  }}
  InputProps={{
    startAdornment: (
      <InputAdornment position="start">
        <Search fontSize="small" />
      </InputAdornment>
    ),
  }}
  sx={{ mt: "1rem", width: "320px" }}
/>
```

### Zero-result state

When `searchFiltered.length === 0`, render a single `<TableRow>` with a
"一致するプロジェクトがありません。" message.

---

## New Imports

```ts
// MUI components
import { ..., TextField, InputAdornment } from "@mui/material"
// MUI icon
import Search from "@mui/icons-material/Search"
// React hooks
import { useState, useRef, useEffect } from "react"
```

---

## Files Changed

| File | Change type |
|---|---|
| `src/components/EditProject/ProjectTableSection.tsx` | Modify |

---

## Testing Checklist

- [ ] Search bar filters projects by name (case-insensitive)
- [ ] Changing search query resets the display to the first 10 matches
- [ ] Scrolling to the bottom of the list loads the next 10 projects
- [ ] Gradient overlay is visible when more projects exist
- [ ] Gradient overlay disappears when all projects are displayed
- [ ] Zero-result message appears when search returns no matches
- [ ] Existing link / unlink behavior is unaffected
- [ ] Existing metadata sub-row (ProjectRow) behavior is unaffected
- [ ] `npm run ci` passes (lint + typecheck + vitest + build)
