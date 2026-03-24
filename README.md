# DMP Editor

**Data Management Plan (DMP)** を **GakuNin RDM** と連携して作成・編集・提出できる Web アプリケーション（フロントエンド SPA）

**GitHub Pages 環境: [https://nii-dg.github.io/dmp-editor/](https://nii-dg.github.io/dmp-editor/)**

## 主な機能

- 5 ステップ形式の DMP 編集フォーム（メタデータ / プロジェクト情報 / 担当者情報 / 研究データ情報 / GRDM 連携）
- 科研費課題番号（KAKEN）による研究者・プロジェクト情報の自動補完
- ROR API を利用したデータ管理機関検索
- GRDM ユーザー検索による担当者情報の自動取り込み
- GRDM プロジェクトとのファイルツリー連携・データセットへのファイルマッピング
- JSPS 様式 Excel エクスポート
- DMP データは GakuNin RDM 上の `dmp-project.json` として保存（専用バックエンドサーバー不要）

## 技術スタック

| カテゴリ | ライブラリ |
|---------|-----------|
| フレームワーク | React 18 + TypeScript |
| UI | Material UI (MUI) v7 |
| フォーム | React Hook Form v7 + Zod |
| データフェッチ | TanStack Query v5 |
| グローバル状態 | Recoil |
| ビルド | Vite |
| テスト | Vitest |
| Excel 出力 | xlsx / fflate |

## Deploy

ローカル環境で DMP Editor を実行するには、以下のコマンドを実行します。

```bash
docker network create dmp-editor-network
docker compose up -d

# ブラウザで localhost:3000 にアクセス
```

## Development

開発環境のセットアップ:

```bash
docker network create dmp-editor-network
docker compose -f compose.dev.yml up -d --build
docker compose -f compose.dev.yml exec app npm run dev
```

### Environmental variables

開発環境においては、必要に応じて以下の環境変数を設定してください。

- `VITE_KAKEN_APP_ID`: KAKEN API の application ID。
    - 「DMP 編集」ページの「2. プロジェクト情報」ステップにて、「KAKEN番号で自動補完」機能を利用する場合に必要です。
    - 当該 ID の発行方法は「[CiNii全般 - メタデータ・API - API利用登録](https://support.nii.ac.jp/ja/cinii/api/developer)」をご参照ください。

### テスト・品質チェック

```bash
npm run test:vitest    # ユニットテスト（Vitest）
npm run test:lint      # ESLint
npm run test:typecheck # TypeScript 型チェック
npm run ci            # lint + typecheck + vitest + build（CI 相当）
```

## Release

新しいバージョンをリリースするには、以下のスクリプトを実行します。

```bash
bash release.sh <version>

# 1. 設定ファイルのバージョンを更新
# 2. `git commit`, `git tag`, `git push`
# 3. GitHub Actions により以下が自動生成・公開される:
#    - Docker イメージ
#    - GitHub Release
#    - GitHub Pages
```

## Documentation

- [利用マニュアル](docs/manual/01_manual_ja.md)
- [仕様書](docs/development/specifications.md)
- [システム構成](docs/development/02_design/system_architecture.md)
- [データモデル](docs/development/02_design/data_model.md)
- [画面遷移](docs/development/02_design/page_transition.md)

## License

This project is licensed under [Apache-2.0](https://www.apache.org/licenses/LICENSE-2.0).
See the [LICENSE](./LICENSE) file for details.
