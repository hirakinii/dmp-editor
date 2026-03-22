# Implementation Plan: Issue #42 — DetailProject ページのリファクタリング

## 概要

`DetailProject.tsx` のヘッダーラベル・ボタン配置を改善し、エクスポート機能をインライン化する。

## 変更要件

1. ページタイトルを `DMP「<プロジェクト名>」` に変更
2. 「出力」ボタンを「編集する」ボタンの右側に配置
3. 「出力」ボタンのラベルを「出力」に変更（「DMP を出力する」→「出力」）
4. GRDM プロジェクトへのリンクアイコン（`grdm_logo_mark.png`）を「出力」ボタンの右側に配置
5. 「出力」ボタンから「サンプル形式」を削除（JSPS 形式のみに）
6. 詳細ページの「DMP の出力」セクション（`ExportDmpCard`）を削除

## 完成後のヘッダーレイアウト

```
DMP「<プロジェクト名>」    [編集する]  [出力]  [GRDMアイコン]
```

## 対象ファイル

### 修正

| ファイル | 内容 |
|---|---|
| `src/pages/DetailProject.tsx` | 主要変更（ヘッダー・エクスポートロジックのインライン化） |
| `test/pages/DetailProject.test.tsx` | テストの更新 |

### 削除

| ファイル | 理由 |
|---|---|
| `src/components/EditProject/ExportDmpCard.tsx` | `DetailProject.tsx` からの使用を除外後、参照元なし |
| `test/components/EditProject/ExportDmpCard.test.tsx` | 対象コンポーネント削除に伴う |

## 実装ステップ（TDD）

### Step 1: テストの更新（RED）

`test/pages/DetailProject.test.tsx` を以下の方針で更新する：

#### 削除するテスト・モック
- `ExportDmpCard` のモック定義
- `"renders ExportDmpCard with the project name"` テスト

#### 変更するテスト
- `"renders the page heading"` → `DMP「テスト研究プロジェクト」` に変更

#### 追加するテスト
- `"renders export button"` — 「出力」ボタンが表示されること
- `"export button triggers JSPS download"` — クリックで `exportToJspsExcel` が呼ばれること
- `"export button shows loading state"` — ダウンロード中に「出力中...」が表示されること
- `"renders GRDM icon link with correct href"` — GRDM リンクが `GRDM_CONFIG.BASE_URL/projectId` を持つこと

### Step 2: 実装（GREEN）

`src/pages/DetailProject.tsx` の変更内容：

#### 追加するインポート
```tsx
import DownloadingOutlined from "@mui/icons-material/DownloadingOutlined"
import { CircularProgress, Tooltip, IconButton } from "@mui/material"
import { useState } from "react"
import { useErrorBoundary } from "react-error-boundary"
import { exportToJspsExcel } from "@/jspsExport"
import { GRDM_CONFIG } from "@/config"
import grdmLogoMark from "@/assets/grdm_logo_mark.png"
```

#### 削除するインポート
```tsx
import ExportDmpCard from "@/components/EditProject/ExportDmpCard"
```

#### `DetailProject()` 関数内に追加するロジック
```tsx
const { showBoundary } = useErrorBoundary()
const [isDownloading, setIsDownloading] = useState(false)

const handleDownload = async () => {
  setIsDownloading(true)
  try {
    const name = dmp.projectInfo.projectName || "untitled"
    const blob = await exportToJspsExcel(dmp)
    const filename = `dmp-jsps-${name}.xlsx`
    const url = URL.createObjectURL(blob)
    const a = document.createElement("a")
    a.href = url
    a.download = filename
    a.click()
    URL.revokeObjectURL(url)
  } catch (error) {
    showBoundary(error)
  } finally {
    setIsDownloading(false)
  }
}
```

#### ヘッダー JSX の変更
```tsx
// タイトル
<Typography sx={{ fontSize: "1.5rem" }} component="h1">
  {`DMP「${dmp.projectInfo.projectName}」`}
</Typography>

// ボタン群
<Box sx={{ display: "flex", gap: "0.5rem", alignItems: "center" }}>
  <Button component={Link} to={`/projects/${projectId}`} variant="contained" color="primary">
    {"編集する"}
  </Button>
  <Button
    variant="contained"
    color="secondary"
    onClick={handleDownload}
    disabled={isDownloading}
    startIcon={isDownloading ? <CircularProgress size={20} /> : <DownloadingOutlined />}
  >
    {isDownloading ? "出力中..." : "出力"}
  </Button>
  <Tooltip title="GRDM プロジェクトを開く">
    <IconButton
      component="a"
      href={`${GRDM_CONFIG.BASE_URL}/${projectId}`}
      target="_blank"
      rel="noopener noreferrer"
    >
      <Box component="img" src={grdmLogoMark} alt="GRDM" sx={{ width: 28, height: 28 }} />
    </IconButton>
  </Tooltip>
</Box>
```

#### 削除する JSX
```tsx
<ExportDmpCard
  sx={{ mt: "1.5rem" }}
  dmp={dmp}
  projectName={dmp.projectInfo.projectName}
/>
```

### Step 3: 削除

- `src/components/EditProject/ExportDmpCard.tsx` を削除
- `test/components/EditProject/ExportDmpCard.test.tsx` を削除

### Step 4: CI 確認

```bash
npm run ci
```

- lint / typecheck / vitest / build がすべてパスすること
- 既知の smoke テスト失敗（4件）は無視すること

## セキュリティチェック

- [ ] ハードコードされたシークレットなし
- [ ] GRDM_CONFIG.BASE_URL は環境変数経由（`config.ts`）で管理済み
- [ ] `target="_blank"` には `rel="noopener noreferrer"` を付与済み
- [ ] XSS: 外部入力をそのまま innerHTML に渡す箇所なし
