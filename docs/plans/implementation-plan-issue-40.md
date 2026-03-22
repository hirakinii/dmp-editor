# Implementation Plan: Issue #40 — DMP プロジェクト名プレフィックス変更・フォーム簡素化

## 概要

- DMP 保存先 GRDM プロジェクトのプレフィックスを `dmp-project-` → `DMP-` に変更する
- DMP 保存先プロジェクト名を `DMP-[プロジェクト情報.プロジェクト名]` に固定し、「基本設定」ステップから GRDM プロジェクト名入力フォームを削除する
- DMP 用プロジェクト検索に「`DMP-` プレフィックス」かつ「`dmp-project.json` が存在する」という条件を課す
- GRDM API の rate limit（約 5 req/秒）を考慮し、並列 API コールは最大 4 worker に制限する

---

## 変更対象ファイル

### 1. `src/grdmClient.ts`

#### 1-1. プレフィックス定数の変更

```typescript
// Before
export const DMP_PROJECT_PREFIX = "dmp-project-"

// After
export const DMP_PROJECT_PREFIX = "DMP-"
```

#### 1-2. 並列制御ユーティリティの追加

外部ライブラリを追加せず、シンプルなワーカーベースのセマフォを実装する。

```typescript
/**
 * Runs tasks with bounded concurrency (≤ limit workers at a time).
 * Results preserve input order; failures are captured as rejected entries.
 */
async function runWithConcurrency<T>(
  tasks: (() => Promise<T>)[],
  limit: number,
): Promise<PromiseSettledResult<T>[]> {
  const results: PromiseSettledResult<T>[] = new Array(tasks.length)
  let index = 0

  async function worker(): Promise<void> {
    while (index < tasks.length) {
      const i = index++
      try {
        results[i] = { status: "fulfilled", value: await tasks[i]() }
      } catch (error) {
        results[i] = { status: "rejected", reason: error }
      }
    }
  }

  await Promise.all(Array.from({ length: Math.min(limit, tasks.length) }, worker))
  return results
}
```

- `limit` は定数 `DMP_FILE_CHECK_CONCURRENCY = 4` として定義する
- `worker` 関数が共有カウンタ `index` を通じてタスクを取り合うことで、最大 `limit` 件が同時実行される

#### 1-3. `hasDmpFile` ヘルパーの追加

```typescript
/**
 * Returns true if dmp-project.json exists at the root of the project's osfstorage.
 * Returns false on any error (e.g. network error, permission denied).
 */
const hasDmpFile = async (token: string, projectId: string): Promise<boolean> => {
  try {
    const response = await listingFileNodes(token, projectId, null, false)
    return response.data.some((node) => node.attributes.name === DMP_FILE_NAME)
  } catch {
    return false
  }
}
```

#### 1-4. `listingDmpProjects` 関数の追加

```typescript
/**
 * Returns GRDM projects that are managed by DMP Editor:
 *   - title starts with DMP_PROJECT_PREFIX ("DMP-"), AND
 *   - dmp-project.json exists in the project root.
 *
 * File-existence checks are performed with bounded concurrency
 * (DMP_FILE_CHECK_CONCURRENCY workers) to respect GRDM's rate limit (~5 req/s).
 */
export const listingDmpProjects = async (token: string): Promise<ProjectInfo[]> => {
  const candidates = await listingProjects(token, DMP_PROJECT_PREFIX)

  const tasks = candidates.map((project) => () => hasDmpFile(token, project.id))
  const settled = await runWithConcurrency(tasks, DMP_FILE_CHECK_CONCURRENCY)

  return candidates.filter((_, i) => {
    const result = settled[i]
    return result.status === "fulfilled" && result.value === true
  })
}
```

---

### 2. `src/dmp.ts`

- `DmpFormValues` インターフェースから `grdmProjectName: string` を削除する

```typescript
// Before
export interface DmpFormValues {
  grdmProjectName: string
  dmp: Dmp
}

// After
export interface DmpFormValues {
  dmp: Dmp
}
```

---

### 3. `src/hooks/useUpdateDmp.ts`

- 新規プロジェクト作成時のプロジェクト名を `formValues.dmp.projectInfo.projectName` から導出するよう変更する

```typescript
// Before
const id = isNew
  ? (await createProject(token, `${DMP_PROJECT_PREFIX}${formValues.grdmProjectName}`)).id
  : projectId

// After
const id = isNew
  ? (await createProject(token, `${DMP_PROJECT_PREFIX}${formValues.dmp.projectInfo.projectName}`)).id
  : projectId
```

---

### 4. `src/hooks/useDmpProjects.ts`

- `listingProjects` + `DMP_PROJECT_PREFIX` → `listingDmpProjects` に切り替える

```typescript
// Before
import { listingProjects, ProjectInfo, DMP_PROJECT_PREFIX } from "@/grdmClient"
...
queryFn: () => listingProjects(token, DMP_PROJECT_PREFIX),

// After
import { listingDmpProjects, ProjectInfo } from "@/grdmClient"
...
queryFn: () => listingDmpProjects(token),
```

---

### 5. `src/components/EditProject/GrdmProject.tsx`

- `NewGrdmProject` コンポーネントから `grdmProjectName` の `Controller`・入力フォームを削除する
- 代わりに「DMP の保存先は「プロジェクト情報」で入力するプロジェクト名から `DMP-[プロジェクト名]` という名前で自動決定されます。」旨のメッセージを表示する
- `DMP_PROJECT_PREFIX` / `DmpFormValues` のインポートも削除する

---

### 6. `src/pages/EditProject.tsx`

- `useForm` の `defaultValues` と `reset()` 呼び出しから `grdmProjectName: ""` を削除する
- 既存プロジェクト読み込み時の `grdmProjectName: projectQuery.data.title ?? ""` も削除する

---

### 7. `src/components/EditProject/FormCard.tsx`

- `STEP_FIELDS[0]` から `"grdmProjectName"` を削除する
- `onSubmit` 内の `grdmProjectName` 手動バリデーション（`if (isNew && !getValues("grdmProjectName")?.trim())`）を削除する

---

## テスト変更方針

### `test/grdmClient.nodes.test.ts`

- `"dmp-project-"` → `"DMP-"` に更新（prefix filter のテスト）

### `test/components/Home/ProjectTable.test.tsx`

- `mockProjects` のタイトルを `"dmp-project-Test Project 1"` → `"DMP-Test Project 1"` 等に更新
- ダウンロードファイル名の期待値も合わせて更新

### `test/components/EditProject/FormCard.test.tsx`

- `defaultValues` から `grdmProjectName` をすべて削除
- `FormCardWrapperWithValidation`：`grdmProjectName` の hidden input を削除し、代わりに `dmp.metadata.submissionDate` を `required` かつ空値で登録することで「Step 0 バリデーション失敗」状態を再現する
- "does not show ! error icon when navigating with valid fields" テスト：`grdmProjectName: "Test Project"` という `defaultValues` を削除し、通常の `FormCardWrapper` を使う
- "navigates to detail page after successful save (new project)" テスト：`grdmProjectName: "Test Project"` という `defaultValues` を削除する（`onSubmit` の early-return ロジックが削除されるため不要）

### `test/components/DataInfoSection.test.tsx`、`test/components/EditProject/DmpMetadataSection.test.tsx`、`test/components/EditProject/FileTreeSection.test.tsx`

- `defaultValues` から `grdmProjectName: ""` を削除する

---

## 実装順序

1. `src/grdmClient.ts` — 定数・ユーティリティ・新関数
2. `src/dmp.ts` — 型定義
3. `src/hooks/useUpdateDmp.ts`
4. `src/hooks/useDmpProjects.ts`
5. `src/components/EditProject/GrdmProject.tsx`
6. `src/pages/EditProject.tsx`
7. `src/components/EditProject/FormCard.tsx`
8. テストファイル更新
9. `npm run ci` で全チェック確認
