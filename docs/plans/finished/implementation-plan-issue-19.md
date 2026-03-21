# 修正計画: DMP エクスポートの 3 つのバグ修正

## Context

`dmp-editor` では DMP を JSPS 形式または サンプル形式でエクスポートする機能がある。以下の 3 点にバグが存在する。

1. **ファイル名の不統一**: Home ページと Edit ページでエクスポート時のファイル名規則が異なる
2. **担当者情報の切り捨て**: テンプレート行数 (6 行) を超えた担当者がテンプレートのセクション外 (row 40+) に追記され、視覚的にセクション内に収まらない
3. **研究データ情報の切り捨て**: 同様に、テンプレート行数 (5 行) を超えた研究データがセクション外 (row 40+) に追記される

---

## Bug 1: ファイル名の統一　→　修正済み

### 現状

| 場所 | JSPS 形式 | サンプル形式 |
|------|-----------|-------------|
| Home ページ (`ProjectTable.tsx`) | `${project.title}_jsps.xlsx` | `${project.title}_sample.xlsx` |
| Edit ページ (`ExportDmpCard.tsx`) | `jsps_dmp.xlsx` (固定値) | `dmp.xlsx` (固定値) |

### 修正内容

**統一後のフォーマット**: `dmp-<format>-<projectName>.xlsx`
- JSPS 形式: `dmp-jsps-<projectName>.xlsx`
- サンプル形式: `dmp-sample-<projectName>.xlsx`

#### `src/components/EditProject/ExportDmpCard.tsx`

`handleDownload` 関数でプロジェクト名を取得してファイル名を生成する:
```typescript
const projectName = getValues().grdmProjectName || getValues().dmp.projectInfo.projectName || "untitled"
const filename = `dmp-${format}-${projectName}.xlsx`
```
- `getValues().grdmProjectName` は `useFormContext<DmpFormValues>()` で取得可能

#### `src/components/Home/ProjectTable.tsx`

`handleExport` 関数のファイル名を変更する:
```typescript
triggerDownload(blob, `dmp-jsps-${project.title}.xlsx`)
triggerDownload(blob, `dmp-sample-${project.title}.xlsx`)
```

---

## Bug 2 & 3: オーバーフロー行をセクション内に挿入　→　修正済み

### 現状の問題

`src/jspsExport.ts` の `buildJspsWorkbook` は、テンプレート容量を超えた行を `OVERFLOW_ROW_START = 40` 以降（テンプレートのセクション 5-7「研究計画、署名等」の後ろ）に追記している。そのため、セクション 3 (担当者情報) やセクション 4 (研究データ情報) の外に出力される。

### テンプレート構造（JSPS `xl/worksheets/sheet1.xml`）

- Section 3 (担当者情報): rows 13–18 (6 行)
  - マージセル: `E12:F12`、`E13:F13` 〜 `E18:F18`
- Section 4 (研究データ情報): rows 22–26 (5 行)
  - マージセルなし
- その他セクション: rows 27–39
- `<dimension ref="A1:N39"/>`

### 修正方針: 行挿入によるセクション内展開

余剰行をセクション最終行の直後に **挿入** し、後続のすべての行を下にシフトする。

### 新規ヘルパー関数（`jspsExport.ts` 内）

#### `extractRowXml(sheetXml, rowNum): string`
指定した行番号の `<row>` XML 全体を返す。

#### `cloneStyledRow(rowXml, sourceRow, targetRow): string`
- 行番号と全セル参照を `targetRow` に更新
- `<v>`, `<is>`, `t="..."` を削除してセル値をクリア（スタイルは保持）

#### `shiftRowsFrom(sheetXml, fromRow, shift): string`
正規表現の replacer 関数を使用して 1 パスで安全に置換（二重置換なし）:
- `<row r="N">` → N >= fromRow の場合 N+shift
- `<c r="XN">` → N >= fromRow の場合 X(N+shift)
- `<mergeCell ref="X1:Y1">` → 該当行番号を更新

#### `insertRowsAfter(sheetXml, afterRowNum, rowsXml): string`
指定行番号の `</row>` 直後に rowsXml 文字列を挿入する。

#### `addMergeCells(sheetXml, merges): string`
`<mergeCells count="N">` のカウントを更新し、新しい merge エントリを追加する。

### `buildJspsWorkbook` の修正フロー

```plaintext
1. Section 3: 担当者情報
   extraPersonCount = max(0, personRows.length - PERSON_ROW_COUNT)
   if extraPersonCount > 0:
     a. row 18 のクローンを extraPersonCount 個作成 (rows 19, 20, ...)
     b. shiftRowsFrom(sheetXml, 19, extraPersonCount)  // row 19+ を下にシフト
     c. insertRowsAfter(sheetXml, 18, clonedRows)       // row 18 の直後に挿入
     d. addMergeCells(["E19:F19", ...])                 // マージセルを追加

2. 全担当者行 (rows 13 〜 12+personRows.length) にデータを書き込む

3. Section 4: 研究データ情報
   adjustedDataStart = DATA_ROW_START + extraPersonCount
   extraDataCount = max(0, dataRows.length - DATA_ROW_COUNT)
   if extraDataCount > 0:
     a. 最終テンプレート行 (adjustedDataStart + DATA_ROW_COUNT - 1) をクローン
     b. shiftRowsFrom(sheetXml, adjustedDataStart + DATA_ROW_COUNT, extraDataCount)
     c. insertRowsAfter(sheetXml, lastDataTemplateRow, clonedRows)

4. 全研究データ行 (rows adjustedDataStart 〜 ...) にデータを書き込む

5. updateDimension(sheetXml, 39 + extraPersonCount + extraDataCount)
```

### 旧実装の削除

- `OVERFLOW_ROW_START` 定数を削除
- `buildRowXml` 関数を削除
- `appendRowXml` 関数を削除
- `buildJspsWorkbook` の末尾のオーバーフロー追加ロジックを削除

---

## TDD アプローチ

### テストを先に書いてから実装する

#### 新規: `test/components/EditProject/ExportDmpCard.test.tsx`

**RED→GREEN** (Bug 1):
- JSPS 形式のダウンロードファイル名が `dmp-jsps-<projectName>.xlsx` であること
- サンプル形式のダウンロードファイル名が `dmp-sample-<projectName>.xlsx` であること

#### 更新: `test/components/Home/ProjectTable.test.tsx`

**RED→GREEN** (Bug 1):
- JSPS export のファイル名が `dmp-jsps-<project.title>.xlsx` であること
- サンプル export のファイル名が `dmp-sample-<project.title>.xlsx` であること

#### 更新: `test/jspsExport.test.ts`

**RED→GREEN** (Bug 2):
```typescript
it("inserts person overflow rows within section 3 (rows 13-N, not row 40+)", async () => {
  // 7 person rows → overflow 1 row after row 18
  // All persons should be in rows 13-19 in the parsed output
  // Verified by checking cell position in parsed sheet
})
```

**修正: 既存テストを強化** (Bug 3):
現在の `"outputs all rows when dataInfo exceeds 5 entries"` は row 位置を検証していないため:
```typescript
it("inserts data overflow rows within section 4 (not at row 40+)", async () => {
  // 8 data rows → 3 overflow rows inserted after row 26
  // All data should appear before row 39
})
```

---

## 修正対象ファイル

| ファイル | 変更内容 |
|---------|---------|
| `src/jspsExport.ts` | ヘルパー関数追加、buildJspsWorkbook の行挿入ロジック実装、旧オーバーフロー削除 |
| `src/components/EditProject/ExportDmpCard.tsx` | ファイル名生成ロジック修正 |
| `src/components/Home/ProjectTable.tsx` | ファイル名生成ロジック修正 |
| `test/jspsExport.test.ts` | 行挿入テスト追加、既存テスト強化 |
| `test/components/EditProject/ExportDmpCard.test.tsx` | 新規作成 (ファイル名テスト) |
| `test/components/Home/ProjectTable.test.tsx` | ファイル名テスト追加 |

---

## 検証手順

1. `npm run test:vitest` → 新規テストが RED であることを確認 (TDD の RED フェーズ)
2. 実装後、`npm run test:vitest` → すべてのテストが GREEN
3. `npm run ci` → lint + typecheck + vitest + build が全パス
4. (手動) 担当者 7 名・研究データ 7 件の DMP を作成し JSPS 形式でエクスポート → Excel ファイルを開き、担当者情報セクションに 7 行、研究データセクションに 7 行が収まっていることを確認
