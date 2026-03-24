import { accessRights, dataType, researchField } from "@/dmp"

export type ResearchFieldValue = (typeof researchField)[number]
export type DataTypeValue = (typeof dataType)[number]
export type AccessRightsValue = (typeof accessRights)[number]

/** Maps GRDM numeric research-field codes to DMP researchField values. */
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

/** Maps GRDM English data-type strings to DMP dataType values. */
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

/** Maps GRDM English access-rights strings to DMP accessRights values. */
export const ACCESS_RIGHTS_MAP: Record<string, AccessRightsValue> = {
  "open access": "公開",
  "restricted access": "共有",
  "metadata only access": "非共有・非公開",
  "embargoed access": "公開期間猶予",
}

/** Returns the DMP researchField value for a GRDM code, or null if unmappable. */
export const mapResearchField = (value: string): ResearchFieldValue | null =>
  RESEARCH_FIELD_MAP[value] ?? null

/** Returns the DMP dataType value for a GRDM English string, or null if unmappable. */
export const mapDataType = (value: string): DataTypeValue | null =>
  DATA_TYPE_MAP[value] ?? null

/** Returns the DMP accessRights value for a GRDM English string, or null if unmappable. */
export const mapAccessRights = (value: string): AccessRightsValue | null =>
  ACCESS_RIGHTS_MAP[value] ?? null
