# Implementation Plan: Issue #59 Extra — Linked GRDM Projects Table Format

## Overview

Change the "Linked GRDM Projects" section in `DetailProject` from a list display to a table
with four columns: project name (link), project ID, creation date, and last modified date.
Dates are formatted as `YYYY-MM-DD`.

---

## Data Sources

- `LinkedGrdmProject.projectId` — available immediately from DMP data
- `ProjectInfo` (via `useProjectInfo`) — fetched asynchronously:
  - `title` → project name column (link label)
  - `html` → link href
  - `dateCreated` → creation date (ISO string, slice to `YYYY-MM-DD`)
  - `dateModified` → last modified date (ISO string, slice to `YYYY-MM-DD`)

Loading / error fallbacks:
- Name cell: `t("linkedGrdmProjectsSection.loadingProject")` while loading, `projectId` otherwise
- Date cells: `"—"` until `ProjectInfo` resolves

---

## Step 1: Add i18n keys

**Files**: `src/i18n/locales/ja/detailProject.json`, `src/i18n/locales/en/detailProject.json`

Add to `linkedGrdmProjectsSection`:

| key               | ja                         | en                    |
|-------------------|----------------------------|-----------------------|
| `colProjectName`  | GRDM プロジェクト名         | GRDM Project Name     |
| `colProjectId`    | GRDM プロジェクト ID        | GRDM Project ID       |
| `colDateCreated`  | 作成日                     | Created               |
| `colDateModified` | 最終更新日                  | Last Modified         |

---

## Step 2: Update tests (TDD — RED)

**File**: `test/pages/DetailProject.test.tsx`

### Tests to update

- `"falls back to projectId as link text while loading"`:
  Change assertion from `"読み込み中..."` to verifying the row contains `projectId` as the ID
  column value and `"—"` for date cells. Name cell still shows `"読み込み中..."`.

### New tests to add

1. **Table headers**: 4 column headers are rendered
2. **ID column**: The project's `projectId` appears in the ID column cell
3. **Date columns**: `dateCreated` and `dateModified` from `ProjectInfo` are formatted as
   `YYYY-MM-DD` and displayed in the respective cells
4. **Loading state date cells**: While `useProjectInfo` is loading, date cells show `"—"`

---

## Step 3: Update components in `DetailProject.tsx`

### 3-a. `LinkedGrdmProjectItem` → `<TableRow>`

```tsx
function LinkedGrdmProjectItem({ projectId }: { projectId: string }) {
  const { t } = useTranslation("detailProject")
  const projectQuery = useProjectInfo(projectId)

  const href = projectQuery.data?.html ?? `${GRDM_CONFIG.BASE_URL}/${projectId}`
  let nameLabel: string
  if (projectQuery.isLoading) {
    nameLabel = t("linkedGrdmProjectsSection.loadingProject")
  } else {
    nameLabel = projectQuery.data?.title ?? projectId
  }
  const dateCreated = projectQuery.data?.dateCreated?.slice(0, 10) ?? "—"
  const dateModified = projectQuery.data?.dateModified?.slice(0, 10) ?? "—"

  return (
    <TableRow>
      <TableCell>
        <Link href={href} target="_blank" rel="noopener noreferrer" underline="hover">
          {nameLabel}
        </Link>
      </TableCell>
      <TableCell>{projectId}</TableCell>
      <TableCell>{dateCreated}</TableCell>
      <TableCell>{dateModified}</TableCell>
    </TableRow>
  )
}
```

### 3-b. `LinkedGrdmProjectsSection` → `<Table>` wrapper

```tsx
function LinkedGrdmProjectsSection({ projects }: { projects: LinkedGrdmProject[] }) {
  const { t } = useTranslation("detailProject")

  if (projects.length === 0) {
    return (
      <Typography sx={{ color: colors.grey[600], mt: "0.5rem" }}>
        {t("linkedGrdmProjectsSection.empty")}
      </Typography>
    )
  }

  return (
    <TableContainer component={Paper} variant="outlined" sx={{ mt: "0.5rem" }}>
      <Table size="small">
        <TableHead sx={{ backgroundColor: colors.grey[100] }}>
          <TableRow>
            <TableCell sx={{ fontWeight: "bold" }}>
              {t("linkedGrdmProjectsSection.colProjectName")}
            </TableCell>
            <TableCell sx={{ fontWeight: "bold" }}>
              {t("linkedGrdmProjectsSection.colProjectId")}
            </TableCell>
            <TableCell sx={{ fontWeight: "bold" }}>
              {t("linkedGrdmProjectsSection.colDateCreated")}
            </TableCell>
            <TableCell sx={{ fontWeight: "bold" }}>
              {t("linkedGrdmProjectsSection.colDateModified")}
            </TableCell>
          </TableRow>
        </TableHead>
        <TableBody>
          {projects.map((p) => (
            <LinkedGrdmProjectItem key={p.projectId} projectId={p.projectId} />
          ))}
        </TableBody>
      </Table>
    </TableContainer>
  )
}
```

No changes required to the main `DetailProject` render or imports beyond what is already present.

---

## Step 4: Run tests and verify (GREEN → CI)

```bash
npm run test:vitest
npm run ci
```

---

## Files Changed

| File | Change |
|------|--------|
| `src/i18n/locales/ja/detailProject.json` | Add 4 column name keys to `linkedGrdmProjectsSection` |
| `src/i18n/locales/en/detailProject.json` | Add 4 column name keys to `linkedGrdmProjectsSection` |
| `src/pages/DetailProject.tsx` | Rewrite `LinkedGrdmProjectItem` and `LinkedGrdmProjectsSection` |
| `test/pages/DetailProject.test.tsx` | Update loading fallback test; add 4 new table tests |
