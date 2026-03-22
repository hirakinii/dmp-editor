# Implementation Plan: Issue #44 — ProjectTable リファクタリング

## 概要

`src/components/Home/ProjectTable.tsx` に対して以下のリファクタリングを実施する。

## 変更内容

### 1. プロジェクト名のリンク削除

- `<TableCell>` 内の `<Link>` コンポーネントを除去し、`{project.title}` をプレーンテキストで表示する。
- 不要なインポートを削除:
  - `Link` (MUI)
  - `OpenInNew` (MUI icon)

### 2. Export ボタンのドロップダウン廃止 → 直接出力ボタン化

- `menuAnchor` state を削除する。
- `handleExportClick`、`handleMenuClose` ハンドラを削除する。
- `handleExport` を `format` 引数なしの async 関数に簡略化し、JSPS エクスポートを直接実行する。
- `<Menu>` / `<MenuItem>` コンポーネントを削除する。
- ボタンの `onClick` を直接 `handleExport` に変更する。
- 不要なインポートを削除:
  - `Menu`、`MenuItem` (MUI)
  - `exportToExcel` (`@/excelExport`)
  - `MouseEvent` (React)

### 3. ボタンラベルの変更

- `"Export"` + `"▼"` → `"出力"` に変更する。
- `aria-label="Export"` → `aria-label="出力"` に変更する。

## 影響範囲

- `src/components/Home/ProjectTable.tsx` のみ
- 既存テストの確認・更新が必要な場合は対応する

## 手順

1. `implementation-plan-issue-44.md` を `docs/plans/` に保存 ✅
2. `ProjectTable.tsx` を修正する
3. lint / typecheck / test を実行して確認する
