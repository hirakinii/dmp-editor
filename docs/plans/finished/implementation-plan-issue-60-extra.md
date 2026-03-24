# 実装計画：GRDM ファイルメタデータ enum 値マッピング (#60 extra)

## 背景

GRDM ファイルメタデータ API が返す値と DMP-Editor の enum 定義には以下の相違がある。

| DMP フィールド | GRDM 値形式 | DMP 値形式 | 例 |
|---|---|---|---|
| `researchField` | 数値コード文字列 | 日本語 | `"189"` → `"ライフサイエンス"` |
| `dataType` | 英語文字列 | 日本語 | `"dataset"` → `"データセット"` |
| `accessRights` | 英語文字列 | 日本語 | `"open access"` → `"公開"` |

現状の `getGrdmFieldValue` は値を変換せずそのまま返すため、これらのフィールドをインポートすると
`z.enum()` バリデーションエラーが発生する。

---

## 対応方針

1. **マッピングテーブルを独立ファイルに切り出す** (`grdmValueMappers.ts`)
   - メンテナンス性の向上とコードの冗長性を回避
2. **`GrdmFieldMapping` に `transform` オプションを追加**
   - enum 変換が必要なフィールドのみ transform を指定
3. **`mappedFields` の計算時に transform を適用**
   - 変換結果が `null`（マッピング不能）の場合は既存の filter により採用候補から除外

---

## 対象ファイル

| ファイル | 種別 | 変更内容 |
|---|---|---|
| `src/components/EditProject/grdmValueMappers.ts` | 新規作成 | マッピングテーブル・変換関数の定義 |
| `src/components/EditProject/DataInfoSection.tsx` | 修正 | `GrdmFieldMapping` に `transform` 追加、`GRDM_FIELD_MAP` を更新、`mappedFields` 計算に transform 適用 |
| `test/components/EditProject/grdmValueMappers.test.ts` | 新規作成 | マッピング関数の単体テスト |

---

## 実装詳細

### 1. `grdmValueMappers.ts`（新規作成）

```ts
import { researchField, dataType, accessRights } from "@/dmp"

// Type aliases for enum values
export type ResearchFieldValue = typeof researchField[number]
export type DataTypeValue = typeof dataType[number]
export type AccessRightsValue = typeof accessRights[number]

// GRDM numeric code → DMP researchField
export const RESEARCH_FIELD_MAP: Record<string, ResearchFieldValue> = {
  "189": "ライフサイエンス",
  "289": "情報通信",
  "389": "環境",
  "489": "ナノテク・材料",
  "589": "エネルギー",
  "689": "ものづくり技術",
  "789": "社会基盤",
  "889": "フロンティア",
  "900": "人文・社会",
  "1000": "自然科学一般",
  "9999": "その他",
}

// GRDM English string → DMP dataType
export const DATA_TYPE_MAP: Record<string, DataTypeValue> = {
  "dataset": "データセット",
  "aggregated data": "集計データ",
  "clinical trial data": "臨床試験データ",
  "compiled data": "編集データ",
  "encoded data": "符号化データ",
  "experimental data": "実験データ",
  "genomic data": "ゲノムデータ",
  "geospatial data": "地理空間データ",
  "laboratory notebook": "実験ノート",
  "measurement and test data": "測定・評価データ",
  "observational data": "観測データ",
  "recorded data": "記録データ",
  "simulation data": "シミュレーションデータ",
  "survey data": "調査データ",
}

// GRDM English string → DMP accessRights
export const ACCESS_RIGHTS_MAP: Record<string, AccessRightsValue> = {
  "open access": "公開",
  "restricted access": "共有",
  "metadata only access": "非共有・非公開",
  "embargoed access": "公開期間猶予",
}

// Mapper functions (return null for unmappable values)
export const mapResearchField = (value: string): ResearchFieldValue | null =>
  RESEARCH_FIELD_MAP[value] ?? null

export const mapDataType = (value: string): DataTypeValue | null =>
  DATA_TYPE_MAP[value] ?? null

export const mapAccessRights = (value: string): AccessRightsValue | null =>
  ACCESS_RIGHTS_MAP[value] ?? null
```

### 2. `DataInfoSection.tsx` の変更点

**`GrdmFieldMapping` インターフェース**

```ts
// Before
interface GrdmFieldMapping {
  dataInfoKey: keyof DataInfo
  grdmKey: keyof GrdmFileMetadataSchema
  labelKey: string
}

// After
interface GrdmFieldMapping {
  dataInfoKey: keyof DataInfo
  grdmKey: keyof GrdmFileMetadataSchema
  labelKey: string
  transform?: (value: string) => string | null  // optional value converter
}
```

**`GRDM_FIELD_MAP` の enum エントリ更新**

```ts
{ dataInfoKey: "researchField", ..., transform: mapResearchField },
{ dataInfoKey: "dataType",      ..., transform: mapDataType },
{ dataInfoKey: "accessRights",  ..., transform: mapAccessRights },
```

**`mappedFields` の計算（transform 適用）**

```ts
const mappedFields = GRDM_FIELD_MAP.map((m) => {
  const rawValue = getGrdmFieldValue(fileItem, m.grdmKey)
  const grdmValue = rawValue !== null && m.transform ? m.transform(rawValue) : rawValue
  return { ...m, label: t(m.labelKey), currentValue: getCurrentValue(m.dataInfoKey), grdmValue }
}).filter((f) => f.grdmValue !== null)
```

### 3. テスト方針

- 各 mapper 関数について、全マッピングキーが正しく変換されることを検証
- 未知の値 (`"unknown"`) に対して `null` を返すことを検証
- 空文字列 (`""`) に対して `null` を返すことを検証

---

## 変換失敗時の挙動

GRDM 値がマッピングテーブルに存在しない場合、mapper は `null` を返す。
`mappedFields` の `.filter((f) => f.grdmValue !== null)` により比較ダイアログから除外され、
ユーザーには当該フィールドが表示されない（手動入力を促す）。
