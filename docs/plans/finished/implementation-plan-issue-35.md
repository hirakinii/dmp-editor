# Implementation Plan: Husky + commitlint 導入 (#35)

## 概要

このプロジェクトに Husky による git hooks 管理と commitlint による commit message の自動検証を導入する。
コードスタイルは既存の `@stylistic/eslint-plugin` で継続管理し、Prettier は導入しない。

---

## 採用方針

| 項目 | 方針 |
|------|------|
| コードフォーマット | 現状維持（`@stylistic/eslint-plugin` + `eslint --fix`） |
| commit message 規約 | **Conventional Commits** 標準を strict 適用 |
| git hooks 管理 | **Husky v9** |
| staged ファイルへの lint | **lint-staged** |

---

## Conventional Commits 規約

`type(scope): description` の形式を強制する。

### 使用可能な type 一覧

| type | 用途 |
|------|------|
| `feat` | 新機能 |
| `fix` | バグ修正 |
| `docs` | ドキュメントのみの変更 |
| `style` | コードの動作に影響しない変更（空白、フォーマット等） |
| `refactor` | バグ修正でも機能追加でもないコードの変更 |
| `test` | テストの追加・修正 |
| `chore` | ビルドプロセス・補助ツール・ライブラリに関する変更 |
| `ci` | CI 設定の変更 |
| `perf` | パフォーマンス改善 |
| `revert` | 以前のコミットを revert |

### フォーマット規則

- **subject** は小文字始まり（`@commitlint/config-conventional` のデフォルト）
- **subject** の末尾にピリオド不要
- **subject** の最大文字数: 100 文字
- **body** / **footer** は任意
- issue 番号はフッターに `Refs: #XX` または subject 末尾に `#XX` で記述

---

## 導入パッケージ

```
devDependencies に追加:
- husky               git hooks 管理
- @commitlint/cli     commitlint CLI
- @commitlint/config-conventional  Conventional Commits ルールセット
- lint-staged         staged ファイルのみに lint を適用
```

---

## 実装ステップ

### Step 1: パッケージインストール

```bash
npm install --save-dev husky @commitlint/cli @commitlint/config-conventional lint-staged
```

### Step 2: commitlint 設定ファイル作成

`commitlint.config.ts` を作成し、`@commitlint/config-conventional` を extends する。

```ts
// commitlint.config.ts
import type { UserConfig } from "@commitlint/types"

const config: UserConfig = {
  extends: ["@commitlint/config-conventional"],
}

export default config
```

### Step 3: lint-staged 設定

`package.json` の `lint-staged` フィールドに設定を追加する。
staged された `*.{ts,tsx}` ファイルに対して ESLint を実行する。

```json
"lint-staged": {
  "*.{ts,tsx}": "eslint --fix"
}
```

### Step 4: Husky 初期化

```bash
npx husky init
```

`package.json` に `prepare` スクリプトが自動追加される。

### Step 5: git hooks 作成

#### `pre-commit` hook（lint-staged を実行）

```bash
# .husky/pre-commit
npx lint-staged
```

#### `commit-msg` hook（commitlint を実行）

```bash
# .husky/commit-msg
npx --no -- commitlint --edit "$1"
```

### Step 6: package.json scripts 更新

CI スクリプトは既存のまま維持する（husky は `prepare` で管理）。

---

## ファイル変更一覧

| 操作 | ファイル |
|------|---------|
| 新規作成 | `commitlint.config.ts` |
| 新規作成 | `.husky/pre-commit` |
| 新規作成 | `.husky/commit-msg` |
| 更新 | `package.json` (`lint-staged` フィールド、`prepare` スクリプト追加) |

---

## 動作確認

1. `npm run ci` が成功すること
2. 不正な commit message でコミットが拒否されること（例: `bad commit message`）
3. 正しい commit message でコミットが通ること（例: `feat: add new feature`）
