# Implementation Plan: Issue #59 — Linked GRDM Projects Section in DetailProject

## Overview

Add a section to `DetailProject` that displays the list of GRDM projects linked to the DMP,
with clickable links to each project opening in a new tab.
When no projects are linked, show an empty-state message to make users aware of the feature.

---

## Data Structure

- `dmp.linkedGrdmProjects: LinkedGrdmProject[]` — each entry has only `{ projectId: string }`
- `useProjectInfo(projectId)` — fetches `ProjectInfo` from GRDM API including `title` and `html` (project page URL)
- URL fallback: `${GRDM_CONFIG.BASE_URL}/${projectId}`

---

## Implementation Steps

### Step 1: Add i18n keys

**Files**: `src/i18n/locales/ja/detailProject.json`, `src/i18n/locales/en/detailProject.json`

Add:
- `sections.linkedGrdmProjects` — section title
- `linkedGrdmProjectsSection.empty` — empty-state message when no projects are linked
- `linkedGrdmProjectsSection.loadingProject` — accessible label while loading a project name

ja:
```json
"sections": {
  ...
  "linkedGrdmProjects": "リンクされている GRDM プロジェクト"
},
"linkedGrdmProjectsSection": {
  "empty": "GRDM プロジェクトがリンクされていません。編集画面からプロジェクトをリンクできます。",
  "loadingProject": "読み込み中..."
}
```

en:
```json
"sections": {
  ...
  "linkedGrdmProjects": "Linked GRDM Projects"
},
"linkedGrdmProjectsSection": {
  "empty": "No GRDM projects are linked. You can link projects from the edit screen.",
  "loadingProject": "Loading..."
}
```

---

### Step 2: Write tests (TDD — RED)

**File**: `test/pages/DetailProject.test.tsx`

Add mock for `useProjectInfo` (hoisted):
```ts
const { mockUseProjectInfo } = vi.hoisted(() => ({
  mockUseProjectInfo: vi.fn(),
}))
vi.mock("@/hooks/useProjectInfo", () => ({
  useProjectInfo: mockUseProjectInfo,
}))
```

New test group `"Linked GRDM Projects section"`:

1. **Empty state**: When `linkedGrdmProjects: []`, shows the empty-state message
2. **Project listed**: When 1 project is linked, the project title is rendered as a link
3. **Link target**: The link has `target="_blank"` and `rel="noopener noreferrer"`
4. **Link URL**: The link href matches `ProjectInfo.html`
5. **Loading fallback**: While `useProjectInfo` is loading, shows the project ID as fallback
6. **Error fallback**: When `useProjectInfo` returns an error, shows the project ID as fallback
7. **Multiple projects**: When 2 projects are linked, both are rendered

---

### Step 3: Implement components in `DetailProject.tsx`

#### 3-a. `LinkedGrdmProjectItem`

```tsx
function LinkedGrdmProjectItem({ projectId }: { projectId: string }) {
  const { t } = useTranslation("detailProject")
  const projectQuery = useProjectInfo(projectId)

  const title = projectQuery.data?.title ?? projectId
  const href = projectQuery.data?.html ?? `${GRDM_CONFIG.BASE_URL}/${projectId}`

  return (
    <Box component="li" sx={{ py: "0.3rem" }}>
      <Link
        href={href}
        target="_blank"
        rel="noopener noreferrer"
        underline="hover"
      >
        {projectQuery.isLoading ? t("linkedGrdmProjectsSection.loadingProject") : title}
      </Link>
    </Box>
  )
}
```

#### 3-b. `LinkedGrdmProjectsSection`

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
    <Box component="ul" sx={{ pl: "1.5rem", mt: "0.5rem" }}>
      {projects.map((p) => (
        <LinkedGrdmProjectItem key={p.projectId} projectId={p.projectId} />
      ))}
    </Box>
  )
}
```

#### 3-c. Main render — add new section after `dataInfo`

```tsx
{/* リンクされている GRDM プロジェクト */}
<SectionTitle>{t("sections.linkedGrdmProjects")}</SectionTitle>
<LinkedGrdmProjectsSection projects={dmp.linkedGrdmProjects} />
```

#### 3-d. Add imports

- `useProjectInfo` from `@/hooks/useProjectInfo`
- `LinkedGrdmProject` from `@/dmp`
- `Link` from `@mui/material` (MUI Link for anchor rendering)

---

### Step 4: Run tests and verify (GREEN → REFACTOR)

```bash
npm run test:vitest
npm run ci
```

---

## Files Changed

| File | Change |
|------|--------|
| `src/i18n/locales/ja/detailProject.json` | Add `sections.linkedGrdmProjects`, `linkedGrdmProjectsSection.*` |
| `src/i18n/locales/en/detailProject.json` | Same (English) |
| `src/pages/DetailProject.tsx` | Add `LinkedGrdmProjectItem`, `LinkedGrdmProjectsSection`, new section |
| `test/pages/DetailProject.test.tsx` | Add tests for new section |
