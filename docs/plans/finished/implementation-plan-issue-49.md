# Implementation Plan — Issue #49: Auto-rename GRDM Project on Research Title Change

## Overview

When the user edits an existing DMP and changes the research project name (`projectInfo.projectName`),
the corresponding GRDM project should be renamed from `DMP-旧名` to `DMP-新名` upon save.

## Revised Design Consideration

| Scenario | Behaviour |
|----------|-----------|
| **Rename succeeds + DMP write succeeds** | Normal success flow (navigate to detail page) |
| **Rename succeeds + DMP write fails** | Throw `PartialSaveError`; toast shows "プロジェクト名の変更は完了しましたが、DMP ファイルの保存に失敗しました。再度保存を実行してください。" |
| **Rename fails** | Error propagates; DMP write is skipped; existing generic toast is shown |
| **No rename needed** (title unchanged) | Same as current behaviour (only DMP write is performed) |
| **isNew = true** | Unchanged (creates project with `DMP-{name}`, no rename path) |

## Files to Change

### Production Code

| File | Change |
|------|--------|
| `src/grdmClient.ts` | Add `updateProjectTitle` function |
| `src/hooks/useUpdateDmp.ts` | Add `PartialSaveError` class; add `currentProjectTitle` to `UpdateDmpArgs`; implement conditional rename with partial-failure handling |
| `src/components/EditProject/FormCard.tsx` | Import `PartialSaveError`; update `formatSaveError`; pass `currentProjectTitle: project?.title` to `mutate` |

### Test Code

| File | Change |
|------|--------|
| `test/grdmClient.nodes.test.ts` | Add tests for `updateProjectTitle` |
| `test/hooks/useUpdateDmp.test.ts` | **New file** — tests for rename logic and `PartialSaveError` |
| `test/components/EditProject/FormCard.test.tsx` | Add tests for `PartialSaveError` toast message and `currentProjectTitle` propagation |

---

## Step-by-step Plan (TDD)

### Step 1 — Tests for `updateProjectTitle` in `grdmClient.ts`

**File:** `test/grdmClient.nodes.test.ts`

- Add `mockUpdate` to the existing `GrdmClient` mock
- Test: `updateProjectTitle` calls `client.nodes.update(projectId, { title: newTitle })`
- Test: `updateProjectTitle` throws `Error("Failed to update project title")` when `client.nodes.update` rejects

### Step 2 — Implement `updateProjectTitle` in `grdmClient.ts`

```typescript
export const updateProjectTitle = async (
  token: string,
  projectId: string,
  newTitle: string,
): Promise<void> => {
  try {
    const client = createGrdmClient(token)
    await client.nodes.update(projectId, { title: newTitle })
  } catch (error) {
    throw new Error("Failed to update project title", { cause: error })
  }
}
```

### Step 3 — Tests for `useUpdateDmp` (new test file)

**File:** `test/hooks/useUpdateDmp.test.ts`

- Mock `createProject`, `updateProjectTitle`, `writeDmpFile` from `@/grdmClient`
- Test (isNew=true): calls `createProject` with `DMP-{projectName}`; does NOT call `updateProjectTitle`
- Test (isNew=false, title unchanged): does NOT call `updateProjectTitle`; calls `writeDmpFile`
- Test (isNew=false, title changed): calls `updateProjectTitle` with expected new title; calls `writeDmpFile`
- Test (isNew=false, title changed, DMP write fails): `updateProjectTitle` called; throws `PartialSaveError`
- Test (isNew=false, title changed, rename fails): throws generic error; `writeDmpFile` NOT called

### Step 4 — Implement changes in `useUpdateDmp.ts`

Add `PartialSaveError` class:
```typescript
/** Thrown when project rename succeeded but DMP file write failed. */
export class PartialSaveError extends Error {
  constructor(cause: unknown) {
    super("DMP file write failed after project rename")
    this.name = "PartialSaveError"
    this.cause = cause
  }
}
```

Add `currentProjectTitle` to `UpdateDmpArgs`:
```typescript
export interface UpdateDmpArgs {
  projectId: string
  isNew?: boolean
  formValues: DmpFormValues
  /** Current GRDM project title; used to detect whether a rename is needed. */
  currentProjectTitle?: string
}
```

Update `mutationFn`:
```typescript
mutationFn: async ({ projectId, isNew = false, formValues, currentProjectTitle }): Promise<string> => {
  const id = isNew
    ? (await createProject(token, `${DMP_PROJECT_PREFIX}${formValues.dmp.projectInfo.projectName}`)).id
    : projectId

  const expectedTitle = `${DMP_PROJECT_PREFIX}${formValues.dmp.projectInfo.projectName}`
  const wasRenamed = !isNew && !!currentProjectTitle && currentProjectTitle !== expectedTitle
  if (wasRenamed) {
    await updateProjectTitle(token, id, expectedTitle)
  }

  try {
    await writeDmpFile(token, id, formValues.dmp)
  } catch (error) {
    if (wasRenamed) throw new PartialSaveError(error)
    throw error
  }

  queryClient.invalidateQueries({ queryKey: ["dmp", token, id] })
  return id
}
```

### Step 5 — Tests in `FormCard.test.tsx`

- Test: when `mockMutate` calls `onError` with a `PartialSaveError`, the toast shows
  "プロジェクト名の変更は完了しましたが、DMP ファイルの保存に失敗しました。再度保存を実行してください。"
- Test: `mockMutate` is called with `currentProjectTitle` equal to `project?.title`

### Step 6 — Implement changes in `FormCard.tsx`

Import `PartialSaveError`:
```typescript
import { PartialSaveError } from "@/hooks/useUpdateDmp"
```

Update `formatSaveError`:
```typescript
function formatSaveError(error: unknown): string {
  const prefix = "GRDMへの保存に失敗しました"
  if (error instanceof PartialSaveError) {
    return `${prefix}：プロジェクト名の変更は完了しましたが、DMP ファイルの保存に失敗しました。再度保存を実行してください。`
  }
  if (error instanceof Error) {
    if (error.name === "AbortError" || error.message.toLowerCase().includes("timeout")) {
      return `${prefix}：タイムアウト`
    }
    if (error.message.includes("429")) {
      return `${prefix}：リクエスト数が上限を超えました (429)`
    }
    return `${prefix}：${error.message}`
  }
  return prefix
}
```

Pass `currentProjectTitle` in `onSubmit`:
```typescript
updateMutation.mutate(
  { projectId, isNew, formValues, currentProjectTitle: project?.title },
  { ... }
)
```

---

## Security Checklist (pre-commit)

- [ ] No hardcoded secrets
- [ ] All inputs validated (project title comes from form, validated by RHF/Zod)
- [ ] Error messages do not leak internal API details to the user
