# 実装計画：PersonInfoSection の機能拡張（Issue #47）

## 概要

`PersonInfoSection.tsx` に以下の機能を追加する。

1. 担当者情報の編集 UI をモーダルからアコーディオン（インライン展開）に変更する
2. アコーディオン内に GRDM ユーザー検索フォームを追加する
3. `PersonInfo` に `grdmUserId` フィールドを追加する
4. KAKEN 番号検索時に研究代表者・研究分担者を担当者一覧へ自動追加する
5. 各フィールドに値の出自（KAKEN / GRDM / ユーザー入力）を表示する

---

## 修正方針（確認事項の回答を反映）

- KAKEN の role 文字列：`principal_investigator`（研究代表者）、`co_investigator_buntan`（研究分担者）
- 出自情報の保存：`PersonInfo` 内に `source` フィールドとして optional で埋め込む
- GRDM 検索の認証：`tokenAtom` (Recoil) から直接取得
- KAKEN 由来の担当者追加時に既存の同名担当者がいる場合：確認ダイアログを表示し、情報を比較・マージできる UI を提供する（複雑すぎる場合は「同名の担当者が存在します。担当者情報を確認してください。」のシンプルな確認ダイアログにフォールバック）

---

## ファイル変更一覧

| ファイル | 変更種別 | 概要 |
|---|---|---|
| `src/dmp.ts` | 修正 | `grdmUserId`、`ValueSource`、`PersonInfoSource`、`source` フィールドを追加 |
| `src/hooks/useKakenProject.ts` | 修正 | `KakenSearchResult` 型を新設、研究代表者・分担者の `PersonInfo[]` も返す |
| `src/hooks/useGrdmUserSearch.ts` | 新規 | GRDM ユーザー検索 hook |
| `src/components/EditProject/PersonInfoSection.tsx` | 修正 | モーダル → アコーディオン、GRDM 検索、出自表示 |
| `src/components/EditProject/ProjectInfoSection.tsx` | 修正 | KAKEN 検索成功時に担当者を自動追加、重複確認ダイアログ |
| `test/dmp.test.ts` | 修正 | 新フィールドのテストを追加 |
| `test/useKakenProject.test.ts` | 修正 | `PersonInfo[]` 変換のテストを追加 |
| `test/useGrdmUserSearch.test.ts` | 新規 | GRDM ユーザー検索 hook のテスト |

---

## ステップ別実装計画

### Step 1: `src/dmp.ts` のスキーマ拡張

```ts
// 追加する型
export type ValueSource = "kaken" | "grdm" | "manual"

export const personInfoSourceSchema = z.object({
  role: z.enum(["kaken", "grdm", "manual"]).optional(),
  lastName: z.enum(["kaken", "grdm", "manual"]).optional(),
  firstName: z.enum(["kaken", "grdm", "manual"]).optional(),
  eRadResearcherId: z.enum(["kaken", "grdm", "manual"]).optional(),
  orcid: z.enum(["kaken", "grdm", "manual"]).optional(),
  affiliation: z.enum(["kaken", "grdm", "manual"]).optional(),
  contact: z.enum(["kaken", "grdm", "manual"]).optional(),
  grdmUserId: z.enum(["kaken", "grdm", "manual"]).optional(),
})
export type PersonInfoSource = z.infer<typeof personInfoSourceSchema>

// personInfoSchema に追加するフィールド
// grdmUserId: z.string().nullable().optional()
// source: personInfoSourceSchema.optional()
```

`initPersonInfo()` に `grdmUserId: undefined, source: undefined` を追加する。

**テスト（先に作成）：**
- `initPersonInfo()` が `grdmUserId` を含むこと
- `personInfoSchema` が `grdmUserId` と `source` を parse できること
- 旧フォーマット（これらのフィールドなし）でも parse できること（後方互換性）

---

### Step 2: `useKakenProject.ts` の改修

```ts
// 新しい戻り値の型
export interface KakenSearchResult {
  projectInfo: ProjectInfo
  personInfos: PersonInfo[]  // 研究代表者・分担者
}
```

`kakenProjectToDmpProjectInfo` を改修し、`members` フィールドから担当者情報を生成する関数 `kakenMembersToPersonInfos` を新設する。

```ts
// role マッピング
const KAKEN_ROLE_MAP: Record<string, typeof personRole[number]> = {
  principal_investigator: "研究代表者",
  co_investigator_buntan: "研究分担者",
}
```

各 `ResearcherRole` から：
- `name.familyName` → `lastName`
- `name.givenName` → `firstName`
- `eradCode` → `eRadResearcherId`
- `affiliations[0].institution.name` → `affiliation`
- `source` の各フィールドを `"kaken"` に設定

`useKakenProject` hook の戻り値を `KakenSearchResult | null` に変更する。

**テスト（先に作成）：**
- `principal_investigator` メンバーが `["研究代表者"]` ロールで変換されること
- `co_investigator_buntan` メンバーが `["研究分担者"]` ロールで変換されること
- `source` の各フィールドが `"kaken"` であること
- `name` や `affiliations` が空の場合でも crash しないこと

---

### Step 3: `useGrdmUserSearch.ts` の新規作成

```ts
// src/hooks/useGrdmUserSearch.ts
export interface GrdmUserSearchResult {
  id: string
  familyName: string
  givenName: string
  orcid: string | null
  affiliation: string | null  // employment[0].institution
}
```

- `GrdmClient.users.listUsers({ 'filter[family_name]': familyName })` を呼ぶ
- `tokenAtom` から認証トークンを取得する
- `enabled: false` で定義し、`refetch()` で手動実行する
- `useQuery` ではなく `useCallback` + `useState` で実装する（家名が変わるたびに新しいクエリになるため）

実際の実装：
```ts
export function useGrdmUserSearch() {
  const token = useRecoilValue(tokenAtom)
  const [familyName, setFamilyName] = useState("")
  const { data, isFetching, refetch } = useQuery({
    queryKey: ["grdmUsers", familyName],
    queryFn: async () => {
      const client = new GrdmClient({ token, baseUrl: `${GRDM_CONFIG.API_BASE_URL}/` })
      const result = await client.users.listUsers({ 'filter[family_name]': familyName })
      return result.data.map(toGrdmUserSearchResult)
    },
    enabled: false,
  })
  return { familyName, setFamilyName, users: data ?? [], isFetching, search: refetch }
}
```

**テスト（先に作成）：**
- `listUsers` が適切なパラメータで呼ばれること（mock）
- `OsfUserAttributes` が `GrdmUserSearchResult` に正しく変換されること

---

### Step 4: `PersonInfoSection.tsx` の改修

#### 4-1. モーダル → アコーディオン（インライン展開）

`<Dialog>` を削除し、テーブル行の直下に `Collapse` で展開するフォームを追加する。

```tsx
// TableBody 内の構造
{personInfos.map((personInfo, index) => (
  <React.Fragment key={index}>
    {/* 既存の情報表示行 */}
    <TableRow>
      ...（各セルに出自バッジ Chip を追加）
    </TableRow>
    {/* アコーディオン展開行 */}
    <TableRow>
      <TableCell colSpan={7} sx={{ p: 0, border: 0 }}>
        <Collapse in={openIndex === index} unmountOnExit>
          <PersonInfoForm
            index={index}
            onSubmit={handleDialogSubmit}
            onClose={handleClose}
          />
        </Collapse>
      </TableCell>
    </TableRow>
  </React.Fragment>
))}
{/* 新規追加フォーム */}
<TableRow>
  <TableCell colSpan={7} sx={{ p: 0, border: 0 }}>
    <Collapse in={openIndex === personInfos.length} unmountOnExit>
      <PersonInfoForm
        index={personInfos.length}
        onSubmit={handleDialogSubmit}
        onClose={handleClose}
      />
    </Collapse>
  </TableCell>
</TableRow>
```

フォーム部分は `PersonInfoForm` コンポーネントとして切り出す（同ファイル内で定義可）。

#### 4-2. 既存テーブルセルに出自バッジを追加

各 `TableCell` の値の横に `source` に応じた `Chip` を表示する。

```tsx
// SourceBadge コンポーネント（同ファイル内）
function SourceBadge({ source }: { source?: ValueSource }) {
  if (!source) return null
  const labels: Record<ValueSource, string> = {
    kaken: "KAKEN",
    grdm: "GRDM",
    manual: "ユーザーによる入力",
  }
  const colors: Record<ValueSource, "info" | "success" | "default"> = {
    kaken: "info",
    grdm: "success",
    manual: "default",
  }
  return <Chip label={labels[source]} color={colors[source]} size="small" sx={{ ml: 0.5 }} />
}
```

#### 4-3. PersonInfoForm 内の GRDM 検索 UI

アコーディオン内のフォーム上部に GRDM ユーザー検索パネルを追加する。

```
[姓で検索: ___________] [検索ボタン]
検索結果: [ドロップダウンリスト]
```

ユーザーを選択すると、対応するフィールドが `"grdm"` ソースで自動入力される。

#### 4-4. grdmUserId フィールドの追加

フォームの連絡先フィールドの後に `grdmUserId` フィールドを追加する。

#### 4-5. フィールド編集時の出自更新

フォーム内の各フィールドを手動で変更した場合、その項目の `source` を `"manual"` に更新する。

---

### Step 5: `ProjectInfoSection.tsx` の改修

`KakenSearchPanel` コンポーネントに以下を追加する：

1. `useFieldArray` で `dmp.personInfo` を取得する
2. KAKEN 検索成功時、`personInfos` (members から変換した `PersonInfo[]`) を処理する
3. 既存担当者との重複チェック：`lastName + firstName` が一致する担当者がいる場合、確認ダイアログを表示する
4. 確認ダイアログ：
   - 既存情報と KAKEN 情報を並べて表示する（比較 UI）
   - 「既存を保持」「KAKEN 情報で上書き」「スキップ」の選択肢を提供する
   - 実装が複雑な場合は「同名の担当者が存在します。担当者情報を確認してください。」のシンプルダイアログにフォールバックする

**テスト（先に作成）：**
- KAKEN 検索結果から担当者が `append` されること
- 重複がある場合にダイアログが表示されること

---

## 実装順序

```
Step 1: dmp.ts のスキーマ拡張（テスト → 実装）
Step 2: useKakenProject.ts の改修（テスト → 実装）
Step 3: useGrdmUserSearch.ts の新規作成（テスト → 実装）
Step 4: PersonInfoSection.tsx の改修
Step 5: ProjectInfoSection.tsx の改修
```

---

## 非機能要件・注意点

- テーブル内で `<Accordion>` を使用すると HTML 的に不正になるため、`Collapse` + `TableRow` + `TableCell` の組み合わせを使用すること
- `PersonInfoForm` は同一ファイル内のサブコンポーネントとして定義し、新規ファイルは作成しない
- `FormProvider` + `useForm` のダイアログ用フォームは、アコーディオン版でも維持する（バリデーション機能を保持するため）
- `source` フィールドは `dmpSchema` の parse 時に `optional` なので、旧フォーマットの DMP ファイルも引き続き読み込める
- GRDM API の `employment` フィールドは英語名のみ（`institution`）であることに注意。日本語名は `/users/me/` エンドポイントの独自レスポンス（`institution_ja`）にしか存在しない
