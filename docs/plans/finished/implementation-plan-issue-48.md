# Implementation Plan: Issue #48 — DataInfoSection Accordion Refactor + GRDM Metadata Comparison

## Overview

Refactor `DataInfoSection` to:
1. Replace modal-based editing with an inline accordion (following `PersonInfoSection` pattern)
2. Add GRDM file metadata fetch capability per data info entry
3. Add a comparison modal (current values vs GRDM metadata) with per-field selection
4. Display the origin ("source") of each field value beside the field label

---

## Decisions

| Item | Decision |
|---|---|
| Multiple linked files | Use first linked file only |
| Accordion exclusivity | Single accordion open at a time (排他制御) |
| Source initial value | Empty (no badge displayed) |
| GRDM enum mismatch | Accepted — user will verify in browser and request fixes |
| Cancel confirm dialog | Removed (follow PersonInfoSection pattern — キャンセル closes immediately) |

---

## Files to Change

| File | Change Type |
|---|---|
| `src/dmp.ts` | Add `dataInfoSourceSchema`, `DataInfoSource`, update `dataInfoSchema` + `initDataInfo` |
| `src/hooks/useGrdmFileItemMetadata.ts` | New file |
| `src/components/EditProject/DataInfoSection.tsx` | Major refactor |
| `test/components/DataInfoSection.test.tsx` | Update + add tests |

---

## Step 1: `src/dmp.ts` Changes

### Add `dataInfoSourceSchema` (after `personInfoSourceSchema`)

```typescript
export const dataInfoSourceSchema = z.object({
  dataName: valueSourceEnum.optional(),
  publicationDate: valueSourceEnum.optional(),
  description: valueSourceEnum.optional(),
  acquisitionMethod: valueSourceEnum.optional(),
  researchField: valueSourceEnum.optional(),
  dataType: valueSourceEnum.optional(),
  dataSize: valueSourceEnum.optional(),
  reuseInformation: valueSourceEnum.optional(),
  hasSensitiveData: valueSourceEnum.optional(),
  sensitiveDataPolicy: valueSourceEnum.optional(),
  usagePolicy: valueSourceEnum.optional(),
  repositoryInformation: valueSourceEnum.optional(),
  backupLocation: valueSourceEnum.optional(),
  publicationPolicy: valueSourceEnum.optional(),
  accessRights: valueSourceEnum.optional(),
  plannedPublicationDate: valueSourceEnum.optional(),
  repository: valueSourceEnum.optional(),
  dataCreator: valueSourceEnum.optional(),
  dataManagementAgency: valueSourceEnum.optional(),
  rorId: valueSourceEnum.optional(),
  dataManager: valueSourceEnum.optional(),
  dataManagerContact: valueSourceEnum.optional(),
  dataStorageLocation: valueSourceEnum.optional(),
  dataStoragePeriod: valueSourceEnum.optional(),
})
export type DataInfoSource = z.infer<typeof dataInfoSourceSchema>
```

### Update `dataInfoSchema`

Add `source` field at the end (before `linkedGrdmFiles`):

```typescript
source: dataInfoSourceSchema.optional(), // origin of each field's value
```

### Update `initDataInfo()`

Add `source: undefined` to the returned object.

---

## Step 2: `src/hooks/useGrdmFileItemMetadata.ts` (New File)

```typescript
import { GrdmClient } from "@hirakinii-packages/grdm-api-typescript"
import type { GrdmFileItem } from "@hirakinii-packages/grdm-api-typescript"
import { useQuery } from "@tanstack/react-query"
import { useRecoilValue } from "recoil"

import { GRDM_CONFIG } from "@/config"
import { tokenAtom } from "@/store/token"

/**
 * Fetches GRDM file metadata for a specific file by project ID and file path.
 * Fetching is manual: call refetch() to trigger.
 */
export const useGrdmFileItemMetadata = (
  projectId: string | null | undefined,
  filePath: string | null | undefined,
) => {
  const token = useRecoilValue(tokenAtom)

  return useQuery<GrdmFileItem | null, Error>({
    queryKey: ["fileItemMetadata", token, projectId, filePath],
    queryFn: async () => {
      if (!projectId || !filePath) return null
      const client = new GrdmClient({ token, baseUrl: `${GRDM_CONFIG.API_BASE_URL}/` })
      const result = await client.fileMetadata.findFileByPath(projectId, filePath)
      return result ?? null
    },
    enabled: false, // Only fetch on demand via refetch()
  })
}
```

---

## Step 3: `DataInfoSection.tsx` Major Refactor

### Component Architecture

```
DataInfoSection (main)
├── SourceBadge (new local component)
├── DataManagementAgencyField (unchanged)
├── DataInfoForm (new component, like PersonInfoForm)
│   ├── useForm<DataInfo>() — local form
│   ├── useGrdmFileItemMetadata hook
│   ├── Accordion body content (form fields + SourceBadge)
│   ├── "GRDMメタデータを取得" button
│   └── GrdmCompareModal (Dialog inside DataInfoForm)
└── Table with React.Fragment rows
    ├── Data row (name, field, type, 関連ファイル, Up/Down/Edit/Delete)
    └── Accordion row (Collapse → DataInfoForm)
```

### GRDM Field Mapping

```typescript
const GRDM_FIELD_MAP: Array<{
  dataInfoKey: keyof DataInfo
  grdmKey: keyof GrdmFileMetadataSchema
  label: string
}> = [
  { dataInfoKey: "dataName",              grdmKey: "grdm-file:title-ja",              label: "名称" },
  { dataInfoKey: "publicationDate",       grdmKey: "grdm-file:date-issued-updated",   label: "掲載日・掲載更新日" },
  { dataInfoKey: "description",           grdmKey: "grdm-file:data-description-ja",   label: "説明" },
  { dataInfoKey: "researchField",         grdmKey: "grdm-file:data-research-field",   label: "データの分野" },
  { dataInfoKey: "dataType",             grdmKey: "grdm-file:data-type",             label: "データの種別" },
  { dataInfoKey: "dataSize",             grdmKey: "grdm-file:file-size",             label: "概略データ量" },
  { dataInfoKey: "accessRights",         grdmKey: "grdm-file:access-rights",         label: "アクセス権" },
  { dataInfoKey: "plannedPublicationDate", grdmKey: "grdm-file:available-date",      label: "データの公開予定日" },
  { dataInfoKey: "repositoryInformation", grdmKey: "grdm-file:repo-information-ja",  label: "リポジトリ情報 (研究活動時)" },
  { dataInfoKey: "repository",           grdmKey: "grdm-file:repo-url-doi-link",     label: "リポジトリ情報 (研究活動後)" },
  { dataInfoKey: "dataManagementAgency", grdmKey: "grdm-file:hosting-inst-ja",       label: "データ管理機関" },
  { dataInfoKey: "rorId",               grdmKey: "grdm-file:hosting-inst-id",        label: "データ管理機関コード (ROR ID)" },
  { dataInfoKey: "dataManager",         grdmKey: "grdm-file:data-man-name-ja",       label: "データ管理者" },
  { dataInfoKey: "dataManagerContact",  grdmKey: "grdm-file:data-man-email",         label: "データ管理者の連絡先" },
]
```

### `SourceBadge` Component

```typescript
function SourceBadge({ source }: { source?: ValueSource }) {
  if (!source) return null
  const labels: Record<ValueSource, string> = {
    grdm: "GRDMファイルメタデータ",
    manual: "ユーザーによる入力",
    kaken: "KAKEN",
  }
  const colors: Record<ValueSource, "success" | "default" | "info"> = {
    grdm: "success",
    manual: "default",
    kaken: "info",
  }
  return <Chip label={labels[source]} color={colors[source]} size="small" sx={{ ml: 0.5, fontSize: "0.65rem", height: "18px" }} />
}
```

### `DataInfoForm` Component

**Props:**
```typescript
interface DataInfoFormProps {
  index: number
  totalCount: number
  onSubmit: (data: DataInfo) => void
  onClose: () => void
  user: User
  projects: ProjectInfo[]
  researchPhase: ResearchPhase
  personNames: string[]
}
```

**Internal state:**
- `dialogMethods = useForm<DataInfo>(...)` — initialized via `useState` from parent watch (same pattern as PersonInfoForm)
- `compareOpen: boolean`
- `selectedGrdmFields: Set<keyof DataInfo>`

**GRDM fetch:**
```typescript
const firstLinkedFile = dialogMethods.watch("linkedGrdmFiles")?.[0] ?? null
const { data: grdmFileItem, isFetching, refetch } = useGrdmFileItemMetadata(
  firstLinkedFile?.projectId,
  firstLinkedFile?.materialized_path,
)
```

**"GRDMメタデータを取得" button** placed in the form header area (next to the dataset name field label):
- Disabled if no linked files
- On click: calls `refetch()`, then on success opens compare modal via `useEffect` on `grdmFileItem`

**`updateValue` function** — extends current implementation to track source:
```typescript
const updateValue = <K extends keyof DataInfo>(key: K, value: DataInfo[K]) => {
  // ... (existing value transform logic) ...
  dialogMethods.setValue(key, newValue as never, { shouldDirty: true })
  // Track as manual input
  const currentSource = dialogMethods.getValues("source") ?? {}
  dialogMethods.setValue("source", { ...currentSource, [key]: "manual" } as never)
}
```

**Compare modal** (inside DataInfoForm as a `<Dialog>`):
- Shows table: 項目 | 現在の値 | GRDM の値 | 採用
- Checkbox per row to select GRDM value
- "GRDM ファイルメタデータを全て反映させる" button
- "選択した項目を反映させる" button
- On apply: `dialogMethods.setValue(key, grdmValue)` + `source[key] = "grdm"` for each selected field

### Accordion Layout in `DataInfoSection`

```typescript
// In the main Table:
{dataInfos.map((dataInfo, index) => (
  <React.Fragment key={index}>
    {/* Data row */}
    <TableRow>
      <TableCell>{dataInfo.dataName}</TableCell>
      <TableCell>{dataInfo.researchField}</TableCell>
      <TableCell>{dataInfo.dataType}</TableCell>
      <TableCell>{/* 関連ファイル button */}</TableCell>
      <TableCell>
        {/* Up / Down / 編集(toggle) / 削除 */}
        <Button onClick={() => openIndex === index ? handleClose() : handleOpen(index)}>
          {openIndex === index ? "閉じる" : "編集"}
        </Button>
      </TableCell>
    </TableRow>
    {/* Accordion row */}
    <TableRow>
      <TableCell colSpan={5} sx={{ p: 0, border: openIndex === index ? undefined : "none" }}>
        <Collapse in={openIndex === index} unmountOnExit>
          <DataInfoForm
            key={`form-${index}-${openIndex}`}
            index={index}
            totalCount={dataInfos.length}
            onSubmit={handleFormSubmit}
            onClose={handleClose}
            user={user}
            projects={projects}
            researchPhase={researchPhase}
            personNames={personNames}
          />
        </Collapse>
      </TableCell>
    </TableRow>
  </React.Fragment>
))}
{/* Add new person accordion row */}
<TableRow key="accordion-new">
  <TableCell colSpan={5} sx={{ p: 0, border: openIndex === dataInfos.length ? undefined : "none" }}>
    <Collapse in={openIndex === dataInfos.length} unmountOnExit>
      <DataInfoForm
        key={`form-new-${openIndex}`}
        index={dataInfos.length}
        totalCount={dataInfos.length}
        onSubmit={handleFormSubmit}
        onClose={handleClose}
        ...
      />
    </Collapse>
  </TableCell>
</TableRow>
```

### State/Logic Removed from `DataInfoSection`

- `cancelConfirmOpen` + `setCancelConfirmOpen`
- `originalValuesRef`
- `dialogMethods` (moved to `DataInfoForm`)
- `isValid`, `isSubmitted` (moved to `DataInfoForm`)
- `handleClose` → simple `setOpenIndex(null)` (no dirty check in parent)
- `handleDiscardAndClose` (removed)
- `getValue`, `getOptions`, `updateValue`, `formatFieldValue`, `computeDiff` (moved to `DataInfoForm`)
- `getValidationRules` (moved to `DataInfoForm`)
- Cancel confirm Dialog (removed)
- Edit Dialog (replaced with accordion)

---

## Step 4: Test Updates

### Update existing tests

Tests currently click "データを追加する" → clicks "追加". The accordion open pattern is the same (the button still opens the form inline).

Tests to update:
- Tests that look for dialog elements (role="dialog") should now find inline content

### New tests to add

1. **Source badge display**: When a data info entry has `source.dataName = "grdm"`, the "GRDMファイルメタデータ" badge should appear next to the field label
2. **Manual source tracking**: Editing a field in the accordion form should not cause errors
3. **GRDM metadata button disabled**: Button should be disabled when no linked files
4. **Compare modal**: Mock `useGrdmFileItemMetadata`, verify modal opens with correct data

---

## Sequence

1. `src/dmp.ts` — schema + type changes
2. `src/hooks/useGrdmFileItemMetadata.ts` — new hook
3. `test/components/DataInfoSection.test.tsx` — update + add tests (RED)
4. `src/components/EditProject/DataInfoSection.tsx` — implement (GREEN)
5. `npm run ci` — verify all checks pass
