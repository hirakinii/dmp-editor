# System Architecture

DMP Editor はバックエンドサーバーを持たないフロントエンド専用 SPA です。データの永続化はすべて GakuNin RDM (GRDM) に委ねます。

## 全体構成

```mermaid
graph TB
    subgraph Browser["Browser (SPA)"]
        subgraph React["React Application"]
            UI["UI Layer<br/>(MUI Components + MUI X Tree View)"]
            RHF["Form State<br/>(React Hook Form + Zod)"]
            RQ["Server State<br/>(TanStack Query)"]
            Recoil["Global State<br/>(Recoil: Auth Token)"]
            i18n["I18n<br/>(i18next: ja/en)"]
        end

        subgraph Clients["API Clients"]
            GRDMClient["grdmClient.ts<br/>(GRDM API v2)"]
            KAKENHook["useKakenProject<br/>(KAKEN API)"]
            RORHook["useRorSearch<br/>(ROR API)"]
        end
    end

    subgraph ExternalAPIs["External APIs"]
        GRDM["GakuNin RDM<br/>(rdm.nii.ac.jp)"]
        KAKEN["KAKEN API<br/>(kaken.nii.ac.jp)"]
        ROR["ROR API<br/>(api.ror.org)"]
    end

    subgraph Storage["Data Storage (GRDM)"]
        DmpJSON["dmp-project.json<br/>(DMP data)"]
        Files["Research Data Files"]
    end

    UI --> RHF
    UI --> RQ
    RQ --> GRDMClient
    KAKENHook --> KAKEN
    RORHook --> ROR
    GRDMClient -->|"Bearer Token"| GRDM
    GRDM --- DmpJSON
    GRDM --- Files

    KAKENHook -.->|"Vite proxy /kaken-api"| KAKEN
    RORHook -.->|"Public API"| ROR
```

## レイヤー構成

### UI Layer（ページ・コンポーネント）

| ファイル | 役割 |
|---------|------|
| `pages/Home.tsx` | プロジェクト一覧・認証 |
| `pages/EditProject.tsx` | DMP 作成・編集（5ステップ Stepper） |
| `pages/DetailProject.tsx` | DMP 詳細表示・JSPS エクスポート |
| `pages/StatusPage.tsx` | エラー・404 表示 |
| `components/EditProject/FormCard.tsx` | Stepper 制御・保存処理 |
| `components/EditProject/*Section.tsx` | 各ステップのフォームセクション |

### 状態管理

```mermaid
graph LR
    subgraph Recoil["Recoil (Global)"]
        Token["tokenAtom<br/>GRDM Access Token<br/>(LocalStorage sync)"]
    end

    subgraph RHF["React Hook Form"]
        FormValues["DmpFormValues<br/>(全フォームデータ)"]
        Zod["Zod Schema<br/>(バリデーション)"]
    end

    subgraph TanStack["TanStack Query"]
        DmpCache["DMP JSON Cache<br/>(dmp, token, projectId)"]
        ProjectsCache["Projects Cache<br/>(dmpProjects, token)"]
        UserCache["User Cache<br/>(user, token)"]
    end

    Token --> TanStack
    TanStack --> RHF
    RHF -->|Save| TanStack
```

### API クライアント

#### GakuNin RDM (`grdmClient.ts`)

- **認証**: Bearer Token（GRDM パーソナルアクセストークン）
- **リトライ**: 最大 5 回・10 秒タイムアウト・HTTP 429 対応
- **並行制限**: DMP ファイル存在確認は最大 4 並行（レート制限対策）
- **主要操作**: プロジェクト CRUD、ファイル読み書き、ユーザー検索、`dmp-project.json` の読み書き

#### KAKEN API (`useKakenProject.ts`)

- **用途**: 科研費課題番号からプロジェクト情報・研究者情報を自動取得
- **CORS 対策**: Vite プロキシ経由（`/kaken-api`, `/nrid-api`）

#### ROR API (`useRorSearch.ts`)

- **用途**: データ管理機関の ROR ID 検索
- **デバウンス**: 300ms・最小クエリ長 2 文字
- **言語**: 日本語クエリ（`[\u3040-\u30FF\u4E00-\u9FFF]`）で `lang: "ja"` 自動適用

## データフロー

### DMP 読み込み

```mermaid
sequenceDiagram
    participant User
    participant EditProject
    participant useDmp
    participant grdmClient
    participant GRDM

    User->>EditProject: /projects/:projectId を開く
    EditProject->>useDmp: projectId でクエリ
    useDmp->>grdmClient: readDmpFile(token, projectId)
    grdmClient->>GRDM: GET /waterbutler/.../dmp-project.json
    GRDM-->>grdmClient: JSON レスポンス
    grdmClient-->>useDmp: DMP オブジェクト（後方互換マイグレーション済）
    useDmp-->>EditProject: DMP データ
    EditProject->>EditProject: RHF reset() でフォームに反映
```

### DMP 保存

```mermaid
sequenceDiagram
    participant User
    participant FormCard
    participant useUpdateDmp
    participant grdmClient
    participant GRDM

    User->>FormCard: 「保存」ボタンクリック
    FormCard->>FormCard: RHF handleSubmit（Zod バリデーション）
    FormCard->>useUpdateDmp: mutate({ dmp, projectTitle })
    useUpdateDmp->>grdmClient: writeDmpFile(token, projectId, dmp)
    useUpdateDmp->>grdmClient: updateProjectTitle(token, projectId, title)
    grdmClient->>GRDM: PUT /waterbutler/.../dmp-project.json
    GRDM-->>grdmClient: 200 OK
    useUpdateDmp->>useUpdateDmp: TanStack Query invalidate
    useUpdateDmp-->>FormCard: 成功通知
    FormCard-->>User: スナックバー表示
```

### KAKEN 自動補完

```mermaid
sequenceDiagram
    participant User
    participant ProjectInfoSection
    participant useKakenProject
    participant KakenAPI

    User->>ProjectInfoSection: 課題番号入力・検索ボタン
    ProjectInfoSection->>useKakenProject: kakenNumber で検索
    useKakenProject->>KakenAPI: GET /kaken-api/... (Vite proxy)
    KakenAPI-->>useKakenProject: プロジェクト・研究者データ
    useKakenProject-->>ProjectInfoSection: 補完データ
    ProjectInfoSection->>ProjectInfoSection: RHF setValue() で各フィールドに反映
    ProjectInfoSection->>ProjectInfoSection: 担当者重複チェック → 確認ダイアログ
```

## エクスポート処理

```mermaid
graph LR
    DMP["DMP データ<br/>(RHF フォーム値)"]
    jspsExport["jspsExport.ts"]
    Template["jsps_template.xlsx<br/>(バイナリテンプレート)"]
    fflate["fflate<br/>(ZIP 展開・再圧縮)"]
    Output["JSPS 様式<br/>.xlsx ファイル"]

    DMP --> jspsExport
    Template --> jspsExport
    jspsExport --> fflate
    fflate --> Output
```

- ZIP として展開 → `xl/worksheets/sheet1.xml` を直接編集
- インラインストリング方式（shared-strings テーブル不使用）
- 担当者・データ項目行の自動拡張（行追加・セル参照シフト・merge セル更新）

## デプロイ構成

```mermaid
graph LR
    subgraph Dev["開発環境"]
        ViteDev["Vite Dev Server :5173"]
        ViteProxy["Vite Proxy<br/>/kaken-api → kaken.nii.ac.jp<br/>/nrid-api → nrid.nii.ac.jp"]
    end

    subgraph Prod["本番環境"]
        GHPages["GitHub Pages<br/>nii-dg.github.io/dmp-editor"]
        Docker["Docker + Nginx :3000"]
    end

    subgraph CI["GitHub Actions"]
        Build["npm run build (Vite)"]
    end

    Build --> GHPages
    Build --> Docker
```

## セキュリティ

| 項目 | 対応 |
|------|------|
| 認証トークン | ブラウザのローカルストレージにのみ保存。サーバーへの転送なし |
| CORS | KAKEN/NRID API は Vite プロキシ経由。ROR は公開 API |
| XSS | JSPS エクスポート時に XML 特殊文字をエスケープ（`escXml()`） |
| 入力検証 | Zod スキーマによるフォームバリデーション（`onBlur` モード） |
