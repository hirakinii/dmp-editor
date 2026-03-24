import { describe, expect, it } from "vitest"

import {
  ACCESS_RIGHTS_MAP,
  DATA_TYPE_MAP,
  RESEARCH_FIELD_MAP,
  mapAccessRights,
  mapDataType,
  mapResearchField,
} from "../../../src/components/EditProject/grdmValueMappers"

// ============================================================
// mapResearchField
// ============================================================

describe("mapResearchField", () => {
  it.each([
    ["189", "ライフサイエンス"],
    ["289", "情報通信"],
    ["389", "環境"],
    ["489", "ナノテク・材料"],
    ["589", "エネルギー"],
    ["689", "ものづくり技術"],
    ["789", "社会基盤"],
    ["889", "フロンティア"],
    ["900", "人文・社会"],
    ["1000", "自然科学一般"],
    ["9999", "その他"],
  ] as const)("maps GRDM code %s to DMP value %s", (code, expected) => {
    expect(mapResearchField(code)).toBe(expected)
  })

  it("returns null for unknown code", () => {
    expect(mapResearchField("0")).toBeNull()
    expect(mapResearchField("unknown")).toBeNull()
  })

  it("returns null for empty string", () => {
    expect(mapResearchField("")).toBeNull()
  })

  it("covers all entries in RESEARCH_FIELD_MAP", () => {
    for (const [key, value] of Object.entries(RESEARCH_FIELD_MAP)) {
      expect(mapResearchField(key)).toBe(value)
    }
  })
})

// ============================================================
// mapDataType
// ============================================================

describe("mapDataType", () => {
  it.each([
    ["dataset", "データセット"],
    ["aggregated data", "集計データ"],
    ["clinical trial data", "臨床試験データ"],
    ["compiled data", "編集データ"],
    ["encoded data", "符号化データ"],
    ["experimental data", "実験データ"],
    ["genomic data", "ゲノムデータ"],
    ["geospatial data", "地理空間データ"],
    ["laboratory notebook", "実験ノート"],
    ["measurement and test data", "測定・評価データ"],
    ["observational data", "観測データ"],
    ["recorded data", "記録データ"],
    ["simulation data", "シミュレーションデータ"],
    ["survey data", "調査データ"],
  ] as const)("maps GRDM value %s to DMP value %s", (grdmValue, expected) => {
    expect(mapDataType(grdmValue)).toBe(expected)
  })

  it("returns null for unknown value", () => {
    expect(mapDataType("unknown")).toBeNull()
    expect(mapDataType("Dataset")).toBeNull() // case-sensitive
  })

  it("returns null for empty string", () => {
    expect(mapDataType("")).toBeNull()
  })

  it("covers all entries in DATA_TYPE_MAP", () => {
    for (const [key, value] of Object.entries(DATA_TYPE_MAP)) {
      expect(mapDataType(key)).toBe(value)
    }
  })
})

// ============================================================
// mapAccessRights
// ============================================================

describe("mapAccessRights", () => {
  it.each([
    ["open access", "公開"],
    ["restricted access", "共有"],
    ["metadata only access", "非共有・非公開"],
    ["embargoed access", "公開期間猶予"],
  ] as const)("maps GRDM value %s to DMP value %s", (grdmValue, expected) => {
    expect(mapAccessRights(grdmValue)).toBe(expected)
  })

  it("returns null for unknown value", () => {
    expect(mapAccessRights("unknown")).toBeNull()
    expect(mapAccessRights("Open Access")).toBeNull() // case-sensitive
  })

  it("returns null for empty string", () => {
    expect(mapAccessRights("")).toBeNull()
  })

  it("covers all entries in ACCESS_RIGHTS_MAP", () => {
    for (const [key, value] of Object.entries(ACCESS_RIGHTS_MAP)) {
      expect(mapAccessRights(key)).toBe(value)
    }
  })
})
