# 実装計画：E2E テスト (Playwright) 導入

**目的**: 重要なユーザーフローを自動テストで保護する

**対象ファイル**:
- `playwright.config.ts` (新規作成)
- `e2e/` ディレクトリ (新規作成)

**作業内容**:
1. Playwright をインストール (`npm install --save-dev @playwright/test`)
2. 以下のシナリオの E2E テストを実装:
   - ログイン → DMP 新規作成 → 保存 のフロー
   - 未保存遷移の警告表示確認
   - KAKEN 検索からの自動補完確認
