# Implementation Plan — Issue #60
## DataInfoSection: GRDMからデータを選択ボタン & ファイルツリーモーダル

---

## 概要

`DataInfoSection` 内の研究データ編集フォームに、DMP にリンクされた GRDM プロジェクトのファイル/フォルダを選択するボタンとモーダルを追加する。
あわせて、`FileTreeSection.tsx` との共通ロジックを `GrdmFileTreeView.tsx` として抽出・共通化するリファクタリングを実施する。

---

## 変更ファイル一覧

| ファイル | 種別 | 概要 |
|---|---|---|
| `docs/plans/implementation-plan-issue-60.md` | 新規 | 本計画書 |
| `src/components/EditProject/GrdmFileTreeView.tsx` | 新規 | ファイルツリー共通コンポーネント |
| `src/components/EditProject/GrdmSelectModal.tsx` | 新規 | DataInfoSection 用ファイル選択モーダル |
| `src/components/EditProject/FileTreeSection.tsx` | 変更 | GrdmFileTreeView を使うよう書き換え（大幅短縮） |
| `src/components/EditProject/DataInfoSection.tsx` | 変更 | ボタン行追加・GrdmSelectModal 統合・props 追加 |
| `src/i18n/locales/ja/editProject.json` | 変更 | `selectGrdmData` 翻訳キー追加 |
| `src/i18n/locales/en/editProject.json` | 変更 | `selectGrdmData` 翻訳キー追加 |

---

## 詳細設計

### 1. `GrdmFileTreeView.tsx`（新規）

`FileTreeSection.tsx` からツリーロジックを全て抽出する共通コンポーネント。

#### エクスポートする型

```ts
export type TreeNodeType = "file" | "folder" | "project" | "loading" | "error"
export interface TreeNode {
  projectId: string
  nodeId: string
  label: string
  children: TreeNode[]
  type: TreeNodeType
  size?: number | null
  materialized_path?: string | null
  last_touched?: string | null
  date_modified?: string | null
  date_created?: string | null
  hash_md5?: string | null
  hash_sha256?: string | null
  link?: string | null
}
export type FileTree = TreeNode[]
```

#### エクスポートするユーティリティ

```ts
export { nodeToLinkedFile, allTreeNode }
```

`GrdmSelectModal` 内でフォルダの全子ノード取得に使用するため。

#### Props

```ts
interface GrdmFileTreeViewProps {
  projects: ProjectInfo[]       // DMP にリンクされた GRDM プロジェクト情報
  linkedProjectIds: string[]    // DMP にリンクされたプロジェクト ID 一覧
  renderNodeActions: (node: TreeNode, loadingNodeIds: Set<string>, fetchAllChildren: (node: TreeNode) => Promise<TreeNode | null>) => React.ReactNode
}
```

- `renderNodeActions`: ファイル/フォルダノードに表示するアクションボタンを呼び出し元がカスタマイズできる
  - `FileTreeSection` 用: リンク先 DataInfo 選択ダイアログを開くボタン
  - `GrdmSelectModal` 用: リンク/リンク解除ボタン（リアルタイム反映）

#### 内部ロジック（FileTreeSection から移動）

- 状態管理: `tree`, `expandedMap`, `loadingNodeIds`
- プロジェクト初期化 `useEffect`
- 最初のプロジェクト自動フェッチ `useEffect`
- アコーディオン展開ハンドラ `handleAccordionChange`
- ツリーアイテム展開ハンドラ `handleTreeToggle`
- `fetchAllChildren`（フォルダ再帰フェッチ）
- `retryFetch`
- `renderTree`（`renderNodeActions` を呼び出す）
- アコーディオン + `SimpleTreeView` のレンダリング

---

### 2. `GrdmSelectModal.tsx`（新規）

特定の `DataInfo` に対してファイル/フォルダをリンク/アンリンクするモーダル。

#### Props

```ts
interface GrdmSelectModalProps {
  open: boolean
  onClose: () => void
  projects: ProjectInfo[]
  linkedProjectIds: string[]
  linkedFiles: LinkedGrdmFile[]
  onLinkedFilesChange: (files: LinkedGrdmFile[]) => void
}
```

#### 動作

- `GrdmFileTreeView` を使用してツリーを表示
- `renderNodeActions` で各ノードにリンク/アンリンクボタンを実装:
  - ファイルノード: 「リンク」または「リンク解除」ボタン（現在の `linkedFiles` に存在するか否かで切り替え）
  - フォルダノード: 「リンク」ボタン（`fetchAllChildren` で全子ファイルを取得してリンク）＋「リンク解除」ボタン（フォルダ内の全ファイルをリンク解除）
- リンク/アンリンク操作のたびに `onLinkedFilesChange` を呼びだす（リアルタイム反映）
- リンクされているプロジェクトがない場合: 「DMP にリンクされた GRDM プロジェクトがありません」のメッセージを表示

---

### 3. `FileTreeSection.tsx`（変更）

`GrdmFileTreeView` を使うよう大幅に書き換える。

#### 変更内容

- 移動済みの型・ユーティリティ・状態管理ロジックを削除
- `GrdmFileTreeView` をインポートして使用
- `renderNodeActions`: ノードクリックで「どの DataInfo に紐づけるか」を選ぶダイアログを開くボタンを返す
- ダイアログの中身（`renderDialogContent`）は引き続き `FileTreeSection` 内で管理

---

### 4. `DataInfoSection.tsx`（変更）

#### `DataInfoForm` の Props 追加

```ts
interface DataInfoFormProps {
  index: number
  totalCount: number
  onSubmit: (data: DataInfo) => void
  onClose: () => void
  researchPhase: ResearchPhase
  personNames: string[]
  projects: ProjectInfo[]        // 追加
  linkedProjectIds: string[]     // 追加
}
```

#### ボタン行の変更

現在: `dataName` フィールドのラベル右側に「GRDMメタデータを取得」ボタン

変更後:
```
┌─────────────────────────────────────────────────────────────┐
│  [GRDMからデータを選択]  [GRDMメタデータを取得]             │  ← dataName の上の独立行
├─────────────────────────────────────────────────────────────┤
│  名称 *  [?]                                                │  ← dataName ラベル行（isDataNameField 特殊処理を削除）
│  [テキストフィールド]                                        │
└─────────────────────────────────────────────────────────────┘
```

- `isDataNameField` の特殊ケース処理を削除
- フォームフィールドリストの先頭に独立した `<Box>` でボタン行を追加

#### `GrdmSelectModal` の統合

```ts
const [grdmSelectOpen, setGrdmSelectOpen] = useState(false)
```

- 「GRDMからデータを選択」ボタン押下 → `setGrdmSelectOpen(true)`
- `GrdmSelectModal` の `onLinkedFilesChange` → `dialogMethods.setValue("linkedGrdmFiles", files, { shouldDirty: true })`

#### `DataInfoSection`（親コンポーネント）の変更

```ts
// 既存の useWatch で linkedGrdmProjects を取得
const linkedGrdmProjects = useWatch<DmpFormValues>({
  name: "dmp.linkedGrdmProjects",
  defaultValue: [],
}) as LinkedGrdmProject[]
const linkedProjectIds = linkedGrdmProjects.map((p) => p.projectId)
```

- `DataInfoForm` に `projects` と `linkedProjectIds` を渡す

---

### 5. 翻訳キー追加

**`ja/editProject.json`:**
```json
"editForm": {
  "selectGrdmData": "GRDMからデータを選択",
  ...
}
```

**`en/editProject.json`:**
```json
"editForm": {
  "selectGrdmData": "Select Data from GRDM",
  ...
}
```

---

## 実装順序

1. `GrdmFileTreeView.tsx` を新規作成（ユーティリティ・型・コンポーネント全て）
2. `FileTreeSection.tsx` を `GrdmFileTreeView` 使用へ書き換え（動作確認のため先にリファクタリング）
3. `GrdmSelectModal.tsx` を新規作成
4. `DataInfoSection.tsx` を更新（ボタン行・GrdmSelectModal 統合）
5. 翻訳キーを追加
6. テストを作成・実行

---

## テスト方針

- `GrdmFileTreeView.tsx`: ツリーの初期レンダリング、ノードのアクションボタンが `renderNodeActions` 経由で正しく表示されることを確認するユニットテスト
- `GrdmSelectModal.tsx`: ファイルリンク/アンリンク操作が `onLinkedFilesChange` を呼び出すことを確認するユニットテスト
- `DataInfoSection.tsx`: ボタンが表示されること、GrdmSelectModal が開閉することを確認するユニットテスト
- `npm run ci` で lint・typecheck・vitest・build が全通過することを確認

---

## セキュリティチェック

- GRDM API トークンは `tokenAtom` (Recoil) から取得しており、ハードコードは一切しない
- ユーザー入力の直接描画はなし（ファイルパスは GRDM API レスポンスから取得）
- XSS リスク: MUI コンポーネント経由で描画するため問題なし
