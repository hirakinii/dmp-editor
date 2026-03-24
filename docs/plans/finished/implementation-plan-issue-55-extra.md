# Implementation Plan: i18n for Form Placeholders (Issue #55 Extra)

## 概要

`DataInfoSection.tsx` の入力フォーム placeholder を i18n 対応する。

現状、`formData` 配列内の `placeholder` フィールドおよび
`DataManagementAgencyField` 内の TextField の placeholder がハードコードされている。
これらを `labelKey` と同様に `placeholderKey` パターンで翻訳対応する。

---

## 変更対象ファイル

| ファイル | 変更種別 |
|---|---|
| `src/components/EditProject/DataInfoSection.tsx` | 修正 |
| `src/i18n/locales/ja/editProject.json` | 追記 |
| `src/i18n/locales/en/editProject.json` | 追記 |

---

## Step 1: ロケールファイルに `dataInfo.placeholders.*` を追加

`ja/editProject.json` と `en/editProject.json` の `dataInfo` セクションに
`"placeholders"` オブジェクトを追加する。

### 対象フィールド（placeholder を持つ 14 フィールド）

| key | ja | en |
|---|---|---|
| `dataName` | 例: ○○の実証における○○撮像データ | e.g., Image data captured in ○○ demonstration |
| `description` | 例: ○○実証において、○○撮像画像データ | e.g., Image data captured during ○○ demonstration |
| `acquisitionMethod` | 例: センサを設置し、自ら取得, 自らシミュレーションを行い取得 | e.g., Self-acquired via sensor installation, self-acquired via simulation |
| `dataSize` | 例: 1GB 未満, 1-10GB, 10-100GB, 1TB 以上 | e.g., <1GB, 1-10GB, 10-100GB, >100GB |
| `reuseInformation` | 例: データ項目に関するコードブックあり | e.g., Codebook available for data items |
| `sensitiveDataPolicy` | 例: 個人情報の取扱いについては、関係法令を遵守する。 | e.g., Personal information will be handled in compliance with applicable laws. |
| `usagePolicy` | 例: △△のデータは取得後随時公開、○○のデータは一定期間経過の後公開 | e.g., Data for △△ will be published immediately; data for ○○ after a period. |
| `repositoryInformation` | 例: 研究代表者が所属する○○大学 (研究室) のストレージで保存 | e.g., Stored in the storage of ○○ University (lab) to which the PI belongs |
| `backupLocation` | 例: 研究代表者が所属する○○大学 (研究室) のストレージのバックアップサービスによる | e.g., Backed up via the backup service of ○○ University (lab) to which the PI belongs |
| `publicationPolicy` | 例: 取得後随時公開 | e.g., Published immediately after acquisition |
| `repository` | 例: ○○大学機関リポジトリ, https://doi.org/10.12345/abcde | e.g., ○○ University repository, https://doi.org/10.12345/abcde |
| `dataManagementAgency` | 例: ○○大学 | e.g., ○○ University |
| `rorId` | e.g., https://ror.org/123456789 | e.g., https://ror.org/123456789 |
| `dataManager` | 例: ××推進部 | e.g., ×× Promotion Office |
| `dataManagerContact` | 例: xxx@xxx, 〇〇県〇〇市×× | e.g., xxx@xxx, ×× City, 〇〇 Prefecture |
| `dataStorageLocation` | 例: ○○大学機関リポジトリ, △△研究所内データサーバー | e.g., ○○ University repository, △△ Research Institute data server |
| `dataStoragePeriod` | 例: 永久保存, 10年 | e.g., Permanent storage, 10 years |

---

## Step 2: `DataInfoSection.tsx` の `FormData` interface を変更

```ts
// Before
interface FormData {
  ...
  placeholder?: string
  ...
}

// After
interface FormData {
  ...
  placeholderKey?: string
  ...
}
```

---

## Step 3: `formData` 配列の各エントリを変更

`placeholder: "..."` → `placeholderKey: "dataInfo.placeholders.<key>"` に置き換える。

```ts
// Before
{ key: "dataName", labelKey: "dataInfo.fields.dataName", placeholder: "e.g., ○○...", ... }

// After
{ key: "dataName", labelKey: "dataInfo.fields.dataName", placeholderKey: "dataInfo.placeholders.dataName", ... }
```

---

## Step 4: `formData.map` のレンダリング部分を変更

```tsx
// Before — 分割代入
{ key, labelKey, required: staticRequired, helperText, placeholder, type, ... }
// レンダリング
placeholder={placeholder}

// After — 分割代入
{ key, labelKey, required: staticRequired, helperText, placeholderKey, type, ... }
// レンダリング
placeholder={placeholderKey ? t(placeholderKey) : undefined}
```

---

## Step 5: `DataManagementAgencyField` 内のインライン placeholder を変更

`DataManagementAgencyField` コンポーネントは既に `useTranslation("editProject")` を
使用しているため、以下の変更のみ行う。

```tsx
// Before
placeholder="e.g., ○○大学"

// After
placeholder={t("dataInfo.placeholders.dataManagementAgency")}
```

---

## Step 6: CI で確認

```bash
npm run ci
```

- lint: エラーなし
- typecheck: エラーなし
- vitest: 既知の 4 smoke テスト以外すべて pass
- build: 成功
