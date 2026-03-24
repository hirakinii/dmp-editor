# Page Transition

## 画面遷移図

```mermaid
flowchart TD
    Start((Start))

    subgraph External["外部システム (GRDM)"]
        ExtToken["トークン設定ページ"]
        ExtProject["GRDM プロジェクトページ"]
    end

    subgraph Home["/ ホーム画面"]
        Auth["認証フォーム<br/>(トークン未設定時)"]
        List["DMP プロジェクト一覧<br/>(認証済み時)"]
    end

    subgraph Edit["/projects/:id — DMP 編集画面（5ステップ Stepper）"]
        Step1["Step 1<br/>DMP メタデータ"]
        Step2["Step 2<br/>プロジェクト情報"]
        Step3["Step 3<br/>担当者情報"]
        Step4["Step 4<br/>研究データ情報"]
        Step5["Step 5<br/>GRDM 連携"]
    end

    Detail["/projects/:id/detail<br/>DMP 詳細表示（読み取り専用）"]
    NotFound["* 404 / エラー画面"]

    %% 起動フロー
    Start --> Auth
    Auth -.->|"トークン取得ページへ"| ExtToken
    Auth -->|"トークン入力・認証成功"| List

    %% 一覧画面の操作
    List -->|"新規作成ボタン"| Step1
    List -->|"編集ボタン"| Step1
    List -->|"詳細ボタン"| Detail
    List -.->|"GRDM リンク"| ExtProject
    List -->|"エクスポートボタン"| List

    %% Stepper 内遷移
    Step1 <-->|"次へ / 戻る"| Step2
    Step2 <-->|"次へ / 戻る"| Step3
    Step3 <-->|"次へ / 戻る"| Step4
    Step4 <-->|"次へ / 戻る"| Step5

    %% 編集画面からの離脱
    Step1 -->|"保存 / キャンセル"| List
    Step5 -->|"保存 / キャンセル"| List

    %% 詳細画面の操作
    Detail -->|"編集ボタン"| Step1
    Detail -->|"エクスポートボタン"| Detail
    Detail -->|"戻るボタン"| List

    %% 404
    Start -.->|"不正 URL"| NotFound

    %% スタイル
    classDef main fill:#f9f,stroke:#333,stroke-width:2px
    classDef ext fill:#eee,stroke:#999,stroke-dasharray:5 5
    classDef step fill:#ddf,stroke:#66a,stroke-width:1px
    classDef detail fill:#dfd,stroke:#696,stroke-width:2px

    class Auth,List main
    class ExtToken,ExtProject ext
    class Step1,Step2,Step3,Step4,Step5 step
    class Detail detail
```

## ルート定義

| パス | コンポーネント | 説明 |
|------|--------------|------|
| `/` | `Home.tsx` | 認証フォームまたはプロジェクト一覧 |
| `/projects/new` | `EditProject.tsx` (`isNew=true`) | 新規 DMP 作成（5ステップ） |
| `/projects/:projectId` | `EditProject.tsx` | 既存 DMP 編集（5ステップ） |
| `/projects/:projectId/detail` | `DetailProject.tsx` | DMP 詳細表示（読み取り専用） |
| `*` | `StatusPage.tsx` | 404 / エラー表示 |

## 各画面の主な操作

### ホーム画面 (`/`)

- トークン未設定時は認証フォームを表示
- 認証成功後は `DMP-` プレフィックスの GRDM プロジェクト一覧を表示
- 各行で「編集」「詳細」「エクスポート（JSPS 様式）」「GRDM リンク」を提供

### DMP 編集画面 (`/projects/:id`)

- 5ステップの Stepper で構成
- ステップバークリックまたは「次へ」「戻る」ボタンで移動
- 必須項目が未入力の場合は次ステップへ進めない
- 未保存の変更がある状態でページ離脱を試みると確認ダイアログを表示
- 「保存」で GRDM の `dmp-project.json` に書き込み

### DMP 詳細表示画面 (`/projects/:id/detail`)

- 全フィールドを読み取り専用で表示
- 「編集」ボタンで編集画面へ遷移
- 「エクスポート」ボタンで JSPS 様式 Excel をダウンロード
