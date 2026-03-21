# Implementation Plan: Issue #34 Extra Refactoring

## Overview

追加リファクタリング要件を実装する。対象ブランチ: `34-refactoring-datemodified-slerts-etc`

## Tasks

### 1. 種別フィールド: 新規作成時は「新規」固定・編集不可

**Files**: `src/components/EditProject/DmpMetadataSection.tsx`, `src/components/EditProject/DmpMetaSection.tsx`

**Changes**:
- `DmpMetadataSectionProps` に `isNew: boolean` を追加
- `revisionType` フィールドの `readOnly` を `isNew` 時に `true` にする（disabled 表示）
- `DmpMetaSection` → `DmpMetadataSection` に `isNew` を props として伝播

---

### 2. 提出日バリデーション: 「以降（同日 OK）」に変更

**File**: `src/components/EditProject/DmpMetadataSection.tsx`

**Changes**:
- `submissionDate` バリデーションの条件を `value <= dateCreated` から `value < dateCreated` に変更
- エラーメッセージ: 「提出日は DMP 作成年月日より後の日付を入力してください」
  → 「提出日は DMP 作成年月日以降の日付を入力してください」

---

### 3. ExportDmpCard を props ベースにリファクタ → 詳細ページへ移動

**Files**: `src/components/EditProject/ExportDmpCard.tsx`, `src/pages/EditProject.tsx`, `src/pages/DetailProject.tsx`

**Background**:
現在 `ExportDmpCard` は `useFormContext` に依存しているため、フォームのない詳細ページでは使えない。
また、編集中の中途半端な状態の DMP がエクスポートされることを避けるため、
編集・新規作成ページからは削除し、保存済みデータのある詳細ページに移動する。

**Changes to `ExportDmpCard.tsx`**:
- `useFormContext` 依存を削除
- Props を以下に変更:
  ```tsx
  interface ExportDmpCardProps {
    sx?: SxProps
    dmp: Dmp
    projectName: string
  }
  ```
- バリデーション（`trigger()`）は不要（詳細ページでは保存済みデータを使用）
- `formState` の `isValid`/`isSubmitted` チェックも削除

**Changes to `EditProject.tsx`**:
- `<ExportDmpCard>` の JSX とインポートを削除

**Changes to `DetailProject.tsx`**:
- `ExportDmpCard` をインポートして追加
- `projectName`: `dmp.projectInfo.projectName` を渡す

---

### 4. 「GRDMに保存」ボタンを最後のステップのみ表示

**File**: `src/components/EditProject/FormCard.tsx`

**Changes**:
```tsx
// 変更前: 編集モード(isNew=false)では全ステップで表示
{(!isNew || activeStep === STEPS.length - 1) && <Button ... />}

// 変更後: 常に最後のステップのみ表示
{activeStep === STEPS.length - 1 && <Button ... />}
```

---

### 5. 保存中の Loading 表示 + エラー詳細通知

**Files**: `src/pages/EditProject.tsx`, `src/components/EditProject/FormCard.tsx`

**Design**:

`isSaving` state を `EditProject.tsx` に持たせ、`FormCard` からのコールバックで制御する。

```
保存ボタン押下
  → FormCard: onSaveStart() を呼ぶ
  → EditProject: isSaving = true → <Loading msg="GRDMに保存中..."> を表示

保存成功
  → navigate() でコンポーネント unmount → Loading は自然に消える

保存失敗
  → FormCard: onSaveEnd(error) を呼ぶ
  → EditProject: isSaving = false → フォーム画面に戻る
  → showSnackbar でエラーメッセージを表示
```

**Error message mapping** (`FormCard.tsx` 内の `formatSaveError` ヘルパー):

| エラー種別 | 判定条件 | 表示メッセージ |
|-----------|---------|--------------|
| タイムアウト | `error.name === "AbortError"` またはメッセージに "timeout" | `GRDMへの保存に失敗しました：タイムアウト` |
| 429 Too Many Requests | メッセージに "429" | `GRDMへの保存に失敗しました：リクエスト数が上限を超えました (429)` |
| その他 | - | `GRDMへの保存に失敗しました：${error.message}` |

**Props changes to `FormCard`**:
```tsx
interface FormCardProps {
  // ...既存
  onSaveStart: () => void
  onSaveEnd: () => void
}
```

**`onSubmit` flow** (`FormCard.tsx`):
- 保存開始時に `onSaveStart()` を呼ぶ（既存の `setSaveState("saving")` は削除）
- 成功時: `reset(formValues)` → `navigate()` → `isSaving` は EditProject ごと unmount
- 失敗時: `onSaveEnd()` → スナックバーにエラー詳細を表示
- `saveState` ("idle" | "saving" | "saved" | "error") は不要になるため削除
  - ボタンのラベル変化も不要（Loading 画面が代替する）

---

## Test Plan (TDD)

各変更に対して、実装前にテストを書く（RED → GREEN → REFACTOR）。

### テスト対象

1. **`DmpMetadataSection`**
   - `isNew=true` のとき `revisionType` フィールドが disabled であること
   - `isNew=false` のとき `revisionType` フィールドが有効であること
   - `submissionDate` が `dateCreated` と同日のとき validation が通ること
   - `submissionDate` が `dateCreated` より前のとき validation エラーになること

2. **`FormCard`**
   - 最後のステップ以外では「GRDMに保存」ボタンが表示されないこと
   - 最後のステップでは「GRDMに保存」ボタンが表示されること
   - 保存ボタン押下時に `onSaveStart` が呼ばれること
   - 保存成功時に `onSaveEnd` が呼ばれないこと（navigate するだけ）
   - 保存失敗時に `onSaveEnd` が呼ばれること

3. **`ExportDmpCard`**
   - `dmp` と `projectName` を props として受け取って表示できること
   - ダウンロードボタン押下でファイルがダウンロードされること

4. **`DetailProject`**
   - `ExportDmpCard` が表示されること

## File Change Summary

| File | Change Type |
|------|-------------|
| `src/components/EditProject/DmpMetadataSection.tsx` | Modify |
| `src/components/EditProject/DmpMetaSection.tsx` | Modify |
| `src/components/EditProject/ExportDmpCard.tsx` | Refactor |
| `src/components/EditProject/FormCard.tsx` | Modify |
| `src/pages/EditProject.tsx` | Modify |
| `src/pages/DetailProject.tsx` | Modify |
| `test/components/EditProject/DmpMetadataSection.test.tsx` | Add/Modify |
| `test/components/EditProject/FormCard.test.tsx` | Add/Modify |
| `test/components/EditProject/ExportDmpCard.test.tsx` | Add/Modify |
| `test/pages/DetailProject.test.tsx` | Add/Modify |
