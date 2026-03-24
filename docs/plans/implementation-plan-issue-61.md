# 実装計画: マニュアルページの追加 (Issue #61)

## 概要

`/manual` ルートを追加し、`docs/manual/01_manual_ja.md`（日本語）と `docs/manual/01_manual_en.md`（英語）を Vite の `?raw` import でビルド時に取り込み、`react-markdown` + `remark-gfm` でレンダリングするページを実装する。`AppHeader` にマニュアルへのナビゲーションボタンを追加する。TDD に従い、テストを先に書いてから実装する。

---

## 追加パッケージ

| パッケージ | 用途 | 種別 |
|---|---|---|
| `react-markdown` | Markdown を React コンポーネントとしてレンダリング | dependencies |
| `remark-gfm` | GFM (GitHub Flavored Markdown) 拡張（テーブル等） | dependencies |

インストールコマンド:
```
npm install react-markdown remark-gfm
```

---

## 変更ファイル一覧

| ファイルパス | 新規/変更 | 変更内容の概要 |
|---|---|---|
| `src/vite-env.d.ts` | 変更 | `*.md?raw` → `string` の型宣言を追加 |
| `src/i18n/locales/ja/common.json` | 変更 | `header.manual: "マニュアル"` キーを追加 |
| `src/i18n/locales/en/common.json` | 変更 | `header.manual: "Manual"` キーを追加 |
| `src/pages/ManualPage.tsx` | 新規 | マニュアルページコンポーネント |
| `src/App.tsx` | 変更 | `/manual` ルートを追加・`ManualPage` をインポート |
| `src/components/AppHeader.tsx` | 変更 | マニュアルへのナビゲーションボタンを追加 |
| `test/pages/ManualPage.test.tsx` | 新規 | ManualPage のユニットテスト |
| `test/components/AppHeader.test.tsx` | 新規 | AppHeader のマニュアルボタンテスト |

---

## コンポーネント設計

### ManualPage の JSX 構造

```tsx
<Frame>
  <Box sx={{ py: "2rem" }}>
    <ReactMarkdown
      remarkPlugins={[remarkGfm]}
      components={{
        // MUI コンポーネントマッピング（下記表参照）
      }}
    >
      {content}  {/* i18n.language で ja/en を切り替え */}
    </ReactMarkdown>
  </Box>
</Frame>
```

### MUI コンポーネントマッピング表

| Markdown 要素 | MUI コンポーネント | 補足 |
|---|---|---|
| `# h1` | `Typography variant="h4"` | ページ内の最上位見出し |
| `## h2` | `Typography variant="h5"` | セクション見出し |
| `### h3` | `Typography variant="h6"` | サブセクション見出し |
| `#### h4` | `Typography variant="subtitle1" fontWeight="bold"` | 小見出し |
| `p` | `Typography variant="body1" paragraph` | 段落テキスト |
| `a` | `Link` (MUI) | `target="_blank"` + `rel="noopener noreferrer"` |
| `---` | `Divider` | 水平線 |
| `table` | `TableContainer + Table` | GFM テーブル、横スクロール対応 |
| `thead` | `TableHead` | |
| `tbody` | `TableBody` | |
| `tr` | `TableRow` | |
| `th` | `TableCell` + `fontWeight: bold, bgcolor: grey.100` | ヘッダーセル |
| `td` | `TableCell` | |
| コードブロック | `Box component="pre"` | `bgcolor: grey.100`, スクロール対応 |
| インラインコード | `Box component="code"` | グレー背景 |
| `li` | `Box component="li"` + `Typography` | リスト項目 |
| `blockquote` | `Box` + 左ボーダー | ヒント・注意書き |

### AppHeader のマニュアルボタン配置

言語セレクタ `<Select>` の直前に `<Tooltip>` + `<IconButton>` を挿入:

```tsx
<Tooltip title={t("header.manual")}>
  <IconButton
    onClick={() => navigate("/manual")}
    size="small"
    aria-label={t("header.manual")}
    sx={{ color: colors.grey[300], "&:hover": { color: "white" } }}
  >
    <MenuBookOutlined />
  </IconButton>
</Tooltip>
```

### 言語切り替えロジック

```typescript
const { i18n } = useTranslation("common")
const content = i18n.language.startsWith("en") ? enContent : jaContent
```

---

## 実装ステップ (TDD)

### Phase 1: 準備

1. **パッケージインストール**: `npm install react-markdown remark-gfm`
2. **`vite-env.d.ts` に型宣言追加**: `declare module "*.md?raw" { const content: string; export default content }`
3. **i18n キー追加**: ja/en の `common.json` に `header.manual` を追加

### Phase 2: テスト作成（RED）

4. `test/pages/ManualPage.test.tsx` を作成
5. `test/components/AppHeader.test.tsx` を作成
6. `npm run test:vitest` で RED を確認

### Phase 3: 実装（GREEN）

7. `src/pages/ManualPage.tsx` を作成
8. `src/App.tsx` に `/manual` ルートを追加
9. `src/components/AppHeader.tsx` にマニュアルボタンを追加
10. `npm run test:vitest` で GREEN を確認

### Phase 4: 品質確認

11. `npm run ci` で lint・型チェック・ビルドを確認

---

## テスト設計

### ManualPage のテスト (`test/pages/ManualPage.test.tsx`)

**モック方針:**
- `*.md?raw` モジュールは `vi.mock` で軽量な文字列に置き換え
- `@/components/Frame` は `vi.mock` でスタブ化（auth 処理を回避）
- `react-error-boundary` の `useErrorBoundary` をモック

**テストケース:**

| # | テスト名 | 確認内容 |
|---|---------|---------|
| 1 | 日本語コンテンツの表示 | `i18n.language = "ja"` のとき日本語マニュアルの見出しが表示される |
| 2 | 英語コンテンツの表示 | `i18n.language = "en"` のとき英語マニュアルの見出しが表示される |
| 3 | `en-US` でも英語表示 | `startsWith("en")` で判定されること |
| 4 | Frame でラップ | `data-testid="frame"` が存在すること |

### AppHeader のテスト (`test/components/AppHeader.test.tsx`)

**モック方針:**
- `useNavigate` を `vi.mock` でモック
- `useUser`, `useErrorBoundary`, `useSnackbar` をスタブ化

**テストケース:**

| # | テスト名 | 確認内容 |
|---|---------|---------|
| 1 | マニュアルボタンの存在 | `aria-label="header.manual"` のボタンが存在する |
| 2 | クリックで `/manual` に遷移 | ボタンクリックで `navigate("/manual")` が呼ばれる |

---

## セキュリティチェック

- [x] ハードコードされたシークレットなし — Markdown ファイルの静的 import のみ
- [x] ユーザー入力なし — 表示専用ページ
- [x] XSS 防止 — `react-markdown` はデフォルトで HTML をサニタイズ（`rehype-raw` 不使用）
- [x] 外部リンク安全 — `target="_blank"` + `rel="noopener noreferrer"` を明示
- [x] 認証不要のルート — マニュアルはドキュメントのみ、センシティブ情報なし
- [x] ランタイムエラーなし — `?raw` はビルド時解決のため fetch 失敗なし
