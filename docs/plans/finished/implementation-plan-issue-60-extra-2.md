# Implementation Plan: KAKEN Search Confirmation Dialog (Issue #60 Extra-2)

## Overview

KAKEN 番号で検索がヒットした際、即時に自動補完するのではなく、確認モーダルを挟む。
モーダルで YES を選択した場合のみ、ProjectInfo のフォーム補完と PersonInfo の追加を行う。

## Scope

- 変更対象ファイル: `src/components/EditProject/ProjectInfoSection.tsx`
- i18n ファイル: `src/i18n/locales/ja/editProject.json`, `src/i18n/locales/en/editProject.json`
- テストファイル: `test/components/EditProject/ProjectInfoSection.test.tsx`（新規または既存に追記）

## Data Flow (Before → After)

**Before:**
```
handleSearch → result.isSuccess → setValue × 8 + append × N → DuplicatePersonDialog
```

**After:**
```
handleSearch → result.isSuccess → setPendingKakenResult + setConfirmDialogOpen(true)
                                      ↓
                              KakenConfirmDialog (YES/NO)
                                      ↓ YES
                              handleConfirmApply → setValue × 8 + append × N → DuplicatePersonDialog
                                      ↓ NO
                              setConfirmDialogOpen(false), setPendingKakenResult(null)
```

## New Component: `KakenConfirmDialog`

### Props

```ts
interface KakenConfirmDialogProps {
  open: boolean
  kakenNumber: string
  result: KakenSearchResult
  onConfirm: () => void
  onCancel: () => void
}
```

### 表示内容

| 項目 | 内容 |
|------|------|
| タイトル | 「この研究課題情報で自動補完しますか？」 |
| KAKEN番号 | 入力された kakenNumber |
| プログラム名 | `result.projectInfo.programName` |
| プロジェクト名 | `result.projectInfo.projectName` |
| 採択年度 | `result.projectInfo.adoptionYear` |
| 担当者リスト | `lastName` + `firstName` + role（`role[0]` の翻訳値）のリスト表示 |

### ボタン

- YES（variant="contained", color="secondary"）→ `onConfirm` 呼び出し
- NO（variant="outlined", color="secondary"）→ `onCancel` 呼び出し

## State Changes in `KakenSearchPanel`

追加する state:

```ts
const [pendingKakenResult, setPendingKakenResult] = useState<KakenSearchResult | null>(null)
const [confirmDialogOpen, setConfirmDialogOpen] = useState(false)
```

## Function Changes in `KakenSearchPanel`

### `handleSearch` の変更

成功時に即時補完せず、`pendingKakenResult` に保存して `confirmDialogOpen` を true にする：

```ts
if (result.isSuccess && result.data) {
  setPendingKakenResult(result.data)
  setConfirmDialogOpen(true)
}
// notFound / error ハンドリングは現状と同じ
```

### 新規 `handleConfirmApply`

現在の `handleSearch` 内にある補完ロジックをここに移動：
- `setValue` × 8 で ProjectInfo を埋める
- 重複チェックの上 `append` で PersonInfo を追加
- 重複があれば `DuplicatePersonDialog` を開く
- 最後に `setConfirmDialogOpen(false)` および `setPendingKakenResult(null)` をクリア

### 新規 `handleConfirmCancel`

```ts
const handleConfirmCancel = () => {
  setConfirmDialogOpen(false)
  setPendingKakenResult(null)
}
```

## i18n Keys

### ja/editProject.json への追加

`projectInfo.kakenSearch` 以下に追加：

```json
"confirmDialog": {
  "title": "この研究課題情報で自動補完しますか？",
  "kakenNumber": "KAKEN番号",
  "programName": "プログラム名",
  "projectName": "プロジェクト名",
  "adoptionYear": "採択年度",
  "persons": "担当者",
  "noPersons": "（担当者情報なし）",
  "yes": "はい",
  "no": "いいえ"
}
```

### en/editProject.json への追加

```json
"confirmDialog": {
  "title": "Auto-complete with this project information?",
  "kakenNumber": "KAKEN Number",
  "programName": "Program Name",
  "projectName": "Project Name",
  "adoptionYear": "Adoption Year",
  "persons": "Persons",
  "noPersons": "(No persons)",
  "yes": "Yes",
  "no": "No"
}
```

## Tests (TDD — Write First)

File: `test/components/EditProject/KakenConfirmDialog.test.tsx`

1. **renders project info fields**: `kakenNumber`, `programName`, `projectName`, `adoptionYear` が表示される
2. **renders person list**: 担当者の氏名と役割が表示される
3. **onConfirm called on YES click**: YES ボタンクリックで `onConfirm` が呼ばれる
4. **onCancel called on NO click**: NO ボタンクリックで `onCancel` が呼ばれる
5. **dialog is closed when open=false**: `open=false` の場合に内容が表示されない

File: `test/components/EditProject/KakenSearchPanel.test.tsx`（統合テスト）

1. **confirmation dialog opens after search**: 検索成功時に confirm dialog が開き、即時補完されない
2. **form is filled after confirm YES**: YES クリック後に `setValue` が呼ばれる
3. **form is not filled after confirm NO**: NO クリック後に `setValue` が呼ばれない

## Implementation Steps

1. [ ] i18n キーを ja/en の両ファイルに追加
2. [ ] テストを先に記述（`KakenConfirmDialog.test.tsx`）
3. [ ] `KakenConfirmDialog` コンポーネントを `ProjectInfoSection.tsx` に追加
4. [ ] `KakenSearchPanel` の state・ハンドラを変更
5. [ ] 既存テストがパスすることを確認
6. [ ] lint / typecheck を実行して問題なければ完了
