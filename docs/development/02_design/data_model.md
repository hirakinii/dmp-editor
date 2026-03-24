# Data Model

DMP データは GRDM プロジェクト内の `dmp-project.json` として保存されます。以下は `src/dmp.ts` の Zod スキーマに基づくデータモデルです。

## ER 図

```mermaid
erDiagram
    DMP ||--|| DmpMetadata : "has"
    DMP ||--|| ProjectInfo : "has"
    DMP ||--o{ PersonInfo : "has members"
    DMP ||--o{ DataInfo : "has datasets"
    DMP ||--o{ LinkedGrdmProject : "links to"
    DataInfo ||--o{ LinkedGrdmFile : "maps to"

    DMP {
        string grdmProjectId PK "GRDM project ID (external key)"
    }

    DmpMetadata {
        enum revisionType "新規 / 修正 / 更新"
        string submissionDate "提出日 (YYYY-MM-DD)"
        string dateCreated "DMP 作成日 (auto, YYYY-MM-DD)"
        string dateModified "最終更新日 (auto, YYYY-MM-DD)"
        enum researchPhase "計画時 / 研究中 / 報告時"
    }

    ProjectInfo {
        string fundingAgency "資金配分機関名"
        string programName "プログラム名 (nullable)"
        string programCode "プログラムコード (nullable)"
        string projectCode "体系的番号 (15桁)"
        string projectName "プロジェクト名"
        string adoptionYear "採択年度 (nullable)"
        string startYear "事業開始年度 (nullable)"
        string endYear "事業終了年度 (nullable)"
    }

    PersonInfo {
        string[] role "役割 (複数選択)"
        string lastName "姓"
        string firstName "名"
        string eRadResearcherId "e-Rad 研究者番号 (nullable)"
        string orcid "ORCID (nullable)"
        string affiliation "所属機関"
        string contact "連絡先メール (nullable)"
        string grdmUserId "GRDM ユーザーID (nullable)"
        object source "各フィールドの値の出典 (kaken/grdm/manual)"
    }

    DataInfo {
        string dataName "管理対象データの名称"
        string publicationDate "掲載日・掲載更新日 (nullable)"
        string description "データの説明"
        string acquisitionMethod "取得・収集方法 (nullable)"
        enum researchField "データの分野 (11選択肢)"
        enum dataType "データ種別 (14選択肢)"
        string dataSize "概略データ量 (nullable)"
        string reuseInformation "再利用情報 (nullable)"
        enum hasSensitiveData "機微情報の有無 (有/無, nullable)"
        string sensitiveDataPolicy "機微情報の取扱い方針 (nullable)"
        string usagePolicy "利活用・提供方針 (研究活動時)"
        string repositoryInformation "リポジトリ情報 (研究活動時)"
        string backupLocation "バックアップ場所 (nullable)"
        string publicationPolicy "公開・提供方針詳細 (nullable)"
        enum accessRights "アクセス権 (公開/共有/非共有・非公開/公開期間猶予)"
        string plannedPublicationDate "公開予定日 (nullable, YYYY-MM-DD)"
        string repository "リポジトリ情報 (研究活動後, nullable)"
        int dataCreator "担当者インデックス (nullable)"
        string dataManagementAgency "データ管理機関"
        string rorId "ROR ID (nullable)"
        string dataManager "データ管理者"
        string dataManagerContact "データ管理者連絡先"
        string dataStorageLocation "保存場所 (研究事業終了後, nullable)"
        string dataStoragePeriod "保存期間 (研究事業終了後, nullable)"
        object source "各フィールドの値の出典"
    }

    LinkedGrdmProject {
        string projectId "GRDM プロジェクト ID"
        string projectName "GRDM プロジェクト名"
        string projectUrl "GRDM プロジェクト URL"
    }

    LinkedGrdmFile {
        string projectId "所属 GRDM プロジェクト ID"
        string nodeId "GRDM ノード ID (ファイル識別子)"
        string label "ファイル名"
        enum type "固定値: file"
        int size "ファイルサイズ (bytes, nullable)"
        string materialized_path "フルパス (nullable)"
        string last_touched "最終アクセス日時 (nullable)"
        string date_modified "更新日時 (nullable)"
        string date_created "作成日時 (nullable)"
        string hash_md5 "MD5 ハッシュ値 (nullable)"
        string hash_sha256 "SHA256 ハッシュ値 (nullable)"
        string link "GRDM ページ URL (nullable)"
    }
```

## JSON 構造

```json
{
  "metadata": {
    "revisionType": "新規",
    "submissionDate": "2025-04-01",
    "dateCreated": "2025-04-01",
    "dateModified": "2025-04-01",
    "researchPhase": "計画時"
  },
  "projectInfo": {
    "fundingAgency": "日本学術振興会",
    "programName": "科学研究費助成事業",
    "programCode": "JP",
    "projectCode": "230000000000000",
    "projectName": "〇〇に関する研究",
    "adoptionYear": "2023",
    "startYear": "2023",
    "endYear": "2025"
  },
  "personInfo": [
    {
      "role": ["研究代表者"],
      "lastName": "山田",
      "firstName": "太郎",
      "affiliation": "〇〇大学",
      "eRadResearcherId": "12345678",
      "orcid": "0000-0000-0000-0000",
      "contact": "taro@example.ac.jp",
      "grdmUserId": "abc123",
      "source": { "lastName": "kaken", "firstName": "kaken" }
    }
  ],
  "dataInfo": [
    {
      "dataName": "実験データセット A",
      "description": "〇〇実験で取得したデータ",
      "researchField": "ライフサイエンス",
      "dataType": "実験データ",
      "usagePolicy": "プロジェクトメンバーのみ",
      "repositoryInformation": "GRDM プロジェクト内",
      "accessRights": "公開",
      "dataManagementAgency": "〇〇大学",
      "rorId": "https://ror.org/xxxxxxxx",
      "dataManager": "研究推進部",
      "dataManagerContact": "rdm@example.ac.jp",
      "linkedGrdmFiles": [
        {
          "projectId": "xxxxx",
          "nodeId": "abc123",
          "label": "experiment_a.csv",
          "type": "file",
          "materialized_path": "/data/experiment_a.csv",
          "hash_md5": "d41d8cd98f00b204e9800998ecf8427e",
          "size": 4096
        }
      ]
    }
  ],
  "linkedGrdmProjects": [
    {
      "projectId": "xxxxx",
      "projectName": "DMP-〇〇に関する研究",
      "projectUrl": "https://rdm.nii.ac.jp/xxxxx"
    }
  ]
}
```

## 値の出典（source フィールド）

`personInfo` および `dataInfo` の各フィールドには `source` オブジェクトが付随し、値がどこから取得されたかを記録します。

| 値 | 意味 |
|----|------|
| `"kaken"` | KAKEN API から自動取得 |
| `"grdm"` | GRDM ユーザー検索から取得 |
| `undefined` | ユーザーが手動入力 |

## 後方互換性

旧バージョンの `dmp-project.json` は `linkedGrdmProjectIds`（文字列配列）を使用していました。`readDmpFile()` がファイル読み込み時に自動的に `linkedGrdmProjects`（オブジェクト配列）へマイグレーションします。
