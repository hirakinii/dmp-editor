# 実装計画：DMP Editor リファクタリング (Issue #34)

## 概要

DMP Editor に対して提案されたリファクタリング項目を実装する。

**影響ファイル**:
- `src/components/EditProject/DmpMetadataSection.tsx`
- `src/components/EditProject/PersonInfoSection.tsx`
- `src/components/EditProject/ProjectInfoSection.tsx`
- `src/components/EditProject/DataInfoSection.tsx`
- `src/pages/EditProject.tsx`

---

## 実装タスク（実装しやすい順）

### Task 1: KAKEN番号検索で結果なし時に warning を表示

**対象**: `src/components/EditProject/ProjectInfoSection.tsx`

`KakenSearchPanel` の `handleSearch` 内、`result.data === null` の分岐で
`showSnackbar` を呼び出す。

```diff
} else if (result.isSuccess && result.data === null) {
-  // no projects found — keep existing values, show nothing
+  showSnackbar("KAKEN番号に該当するプロジェクトが見つかりませんでした", "warning")
}
```

---

### Task 2: 最終更新日 (dateModified) を保存時に自動セット、UI から削除

**対象**:
- `src/components/EditProject/DmpMetadataSection.tsx` — `formProps` から `dateModified` を削除
- `src/pages/EditProject.tsx` — 保存ハンドラ (`handleSave`) で `setValue("dmp.metadata.dateModified", todayString())` を実行してから送信

---

### Task 3: 新規作成日 (dateCreated) を読み取り専用化

**対象**: `src/components/EditProject/DmpMetadataSection.tsx`

`dateCreated` の `Controller` render 内で `TextField` に `disabled` を付与。
formProps の定義に `readOnly?: boolean` フラグを追加して個別制御できるようにする。

```tsx
<TextField
  {...field}
  disabled={readOnly}
  ...
/>
```

---

### Task 4: 研究データ情報更新モーダルのボタン名を「更新」に変更

**対象**: `src/components/EditProject/DataInfoSection.tsx`

`DialogActions` 内のサブミットボタン:

```diff
- children={openIndex === dataInfos.length ? "追加" : "編集"}
+ children={openIndex === dataInfos.length ? "追加" : "更新"}
```

---

### Task 5: 提出年月日 (submissionDate) のバリデーション

**対象**: `src/components/EditProject/DmpMetadataSection.tsx`

`submissionDate` の `Controller` の `rules` に `validate` を追加。
`useFormContext` から `getValues` を取得し、`dateCreated` と比較する。

```ts
rules={{
  required: "提出日 は必須です",
  validate: (value) => {
    const dateCreated = getValues("dmp.metadata.dateCreated")
    if (dateCreated && value && value <= dateCreated) {
      return "提出日は DMP 作成年月日より後の日付を入力してください"
    }
  },
}}
```

---

### Task 6: 研究データ情報モーダルのキャンセル時 dirty チェック

**対象**: `src/components/EditProject/DataInfoSection.tsx`

- `cancelConfirmOpen` state (`useState<boolean>`) を追加
- `handleClose` を変更: `dialogMethods.formState.isDirty` が `true` なら確認ダイアログを表示、`false` なら即閉じ
- 確認ダイアログのボタン:
  - 「破棄して閉じる」→ フォームを `reset()` して `setOpenIndex(null)`
  - 「編集を続ける」→ 確認ダイアログのみ閉じる

```tsx
const handleClose = () => {
  if (dialogMethods.formState.isDirty) {
    setCancelConfirmOpen(true)
  } else {
    setOpenIndex(null)
  }
}
```

---

### Task 7: 担当者情報の重複チェック・一意ロール制約バリデーション

**対象**: `src/components/EditProject/PersonInfoSection.tsx`

`handleDialogSubmit` の冒頭に以下の検証を追加する。

#### 7-1: 重複チェック（同一人物）

判定キー: `lastName + firstName + affiliation`

```ts
const isDuplicate = personInfos.some((p, i) => {
  if (i === openIndex) return false // 自分自身は除く
  return (
    p.lastName === data.lastName &&
    p.firstName === data.firstName &&
    p.affiliation === data.affiliation
  )
})
if (isDuplicate) {
  showSnackbar("同じ担当者がすでに登録されています", "warning")
  return
}
```

#### 7-2: 一意ロール制約（研究代表者）

```ts
const UNIQUE_ROLES = ["研究代表者", "管理対象データの管理責任者"] as const

for (const role of UNIQUE_ROLES) {
  if (data.role.includes(role)) {
    const alreadyExists = personInfos.some((p, i) => {
      if (i === openIndex) return false
      return p.role.includes(role)
    })
    if (alreadyExists) {
      showSnackbar(`「${role}」はすでに登録されています。一名のみ登録できます。`, "error")
      return
    }
  }
}
```

---

## テスト方針

各タスク実装後、以下のテストを追加・更新する。

| タスク | テストファイル | テスト内容 |
|---|---|---|
| Task 1 | `test/components/ProjectInfoSection.test.tsx` | 検索結果なし時に warning snackbar が表示される |
| Task 2 | `test/pages/EditProject.test.tsx` | 保存時 dateModified が今日の日付になっている |
| Task 3 | `test/components/DmpMetadataSection.test.tsx` | dateCreated フィールドが disabled である |
| Task 4 | `test/components/DataInfoSection.test.tsx` | 編集モーダルのボタンが「更新」である |
| Task 5 | `test/components/DmpMetadataSection.test.tsx` | submissionDate <= dateCreated でバリデーションエラー |
| Task 6 | `test/components/DataInfoSection.test.tsx` | dirty 状態でキャンセル時に確認ダイアログが表示される |
| Task 7 | `test/components/PersonInfoSection.test.tsx` | 重複担当者・重複ロールで追加が阻止される |

---

## 完了条件

- [ ] 全タスクの実装が完了している
- [ ] `npm run ci`（lint + typecheck + vitest + build）がすべて通過する
- [ ] 既知の smoke テスト 4 件以外の失敗がない
