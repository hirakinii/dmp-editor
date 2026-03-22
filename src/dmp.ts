import { z } from "zod"

import { User } from "@/hooks/useUser"

// === Type definitions ===

// DMP 作成・更新情報
export const revisionType = ["新規", "修正", "更新"] as const
export const researchPhases = ["計画時", "研究中", "報告時"] as const
export type ResearchPhase = typeof researchPhases[number]
export const dmpMetadataSchema = z.object({
  revisionType: z.enum(revisionType), // 種別
  submissionDate: z.string(), // 提出日 YYYY-MM-DD
  dateCreated: z.string(), // DMP作成年月日 YYYY-MM-DD
  dateModified: z.string(), // DMP最終更新年月日 YYYY-MM-DD
  researchPhase: z.enum(researchPhases).default("計画時"), // 研究フェーズ
})
export type DmpMetadata = z.infer<typeof dmpMetadataSchema>

// プロジェクト情報
export const projectInfoSchema = z.object({
  fundingAgency: z.string(), // 資金配分機関情報
  programName: z.string().nullable().optional(), // プログラム名(事業名・種目名)
  // NISTEP 体系的番号一覧 (https://www.nistep.go.jp/taikei) に掲載されている「事業・制度名」を記載
  programCode: z.string().nullable().optional(), // 体系的番号におけるプログラム情報コード
  // NISTEP 体系的番号一覧 (https://www.nistep.go.jp/taikei) に掲載されている「機関コード」および「施策・事業の特定コード」を表すコードを記載
  projectCode: z.string(), // 体系的番号 (15桁)
  projectName: z.string(), // プロジェクト名
  adoptionYear: z.string().nullable().optional(), // 採択年度
  startYear: z.string().nullable().optional(), // 事業開始年度
  endYear: z.string().nullable().optional(), // 事業終了年度
})
export type ProjectInfo = z.infer<typeof projectInfoSchema>
// 担当者情報
export const personRole = ["研究代表者", "研究分担者", "管理対象データの作成者", "管理対象データの管理責任者"] as const

export type ValueSource = "kaken" | "grdm" | "manual"
const valueSourceEnum = z.enum(["kaken", "grdm", "manual"])

export const personInfoSourceSchema = z.object({
  role: valueSourceEnum.optional(),
  lastName: valueSourceEnum.optional(),
  firstName: valueSourceEnum.optional(),
  eRadResearcherId: valueSourceEnum.optional(),
  orcid: valueSourceEnum.optional(),
  affiliation: valueSourceEnum.optional(),
  contact: valueSourceEnum.optional(),
  grdmUserId: valueSourceEnum.optional(),
})
export type PersonInfoSource = z.infer<typeof personInfoSourceSchema>

export const personInfoSchema = z.object({
  role: z.array(z.enum(personRole)), // no header
  lastName: z.string(), // 性
  firstName: z.string(), // 名
  eRadResearcherId: z.string().nullable().optional(), // e-Rad研究者番号
  orcid: z.string().nullable().optional(), // ORCID
  affiliation: z.string(), // 所属機関
  contact: z.string().nullable().optional(), // email address
  grdmUserId: z.string().nullable().optional(), // GRDM User ID
  source: personInfoSourceSchema.optional(), // origin of each field's value
})
export type PersonInfo = z.infer<typeof personInfoSchema>

export interface LinkedGrdmFile {
  projectId: string
  nodeId: string
  label: string
  size?: number | null
  materialized_path?: string | null
  last_touched?: string | null
  date_modified?: string | null
  date_created?: string | null
  hash_md5?: string | null
  hash_sha256?: string | null
  type: "file"
  link?: string | null // URL to the GRDM page
}
export const fileNodeSchema: z.ZodType<LinkedGrdmFile> = z.object({
  projectId: z.string(),
  nodeId: z.string(),
  label: z.string(),
  size: z.number().nullable().optional(),
  materialized_path: z.string().nullable().optional(),
  last_touched: z.string().nullable().optional(),
  date_modified: z.string().nullable().optional(),
  date_created: z.string().nullable().optional(),
  hash_md5: z.string().nullable().optional(),
  hash_sha256: z.string().nullable().optional(),
  type: z.enum(["file"]),
  link: z.string().nullable().optional(),
})

// 研究データ情報
export const researchField = ["ライフサイエンス", "情報通信", "環境", "ナノテク・材料", "エネルギー", "ものづくり技術", "社会基盤", "フロンティア", "人文・社会", "自然科学一般", "その他"] as const
export const dataType = ["データセット", "集計データ", "臨床試験データ", "編集データ", "符号化データ", "実験データ", "ゲノムデータ", "地理空間データ", "実験ノート", "測定・評価データ", "観測データ", "記録データ", "シミュレーションデータ", "調査データ"] as const
export const hasSensitiveData = ["有", "無"] as const
export const accessRights = ["公開", "共有", "非共有・非公開", "公開期間猶予"] as const
export const dataInfoSchema = z.object({
  dataName: z.string(), // 管理対象データの名称
  publicationDate: z.string().nullable().optional(), // 掲載日・掲載更新日
  description: z.string(), // データの説明
  acquisitionMethod: z.string().nullable().optional(), // 管理対象データの取得または収集方法
  researchField: z.enum(researchField), // データの分野
  dataType: z.enum(dataType), // データ種別
  dataSize: z.string().nullable().optional(), // 概略データ量
  reuseInformation: z.string().nullable().optional(), // 再利用を可能にするための情報
  hasSensitiveData: z.enum(hasSensitiveData).nullable().optional(), // 機微情報の有無
  sensitiveDataPolicy: z.string().nullable().optional(), // 機微情報がある場合の取扱い方針
  usagePolicy: z.string(), // 管理対象データの利活用・提供方針 (研究活動時)
  repositoryInformation: z.string(), // リポジトリ情報 (研究活動時)
  backupLocation: z.string().nullable().optional(), // 管理対象データのバックアップ場所 (研究活動時)
  publicationPolicy: z.string().nullable().optional(), // 管理対象データの公開・提供方針詳細
  accessRights: z.enum(accessRights), // アクセス権
  plannedPublicationDate: z.string().nullable().optional(), // 管理対象データの公開予定日 YYYY-MM-DD
  repository: z.string().nullable().optional(), // リポジトリ情報 (リポジトリ URL・DOIリンク) (研究活動後)
  dataCreator: z.number().nullable().optional(), // 管理対象データの作成者
  dataManagementAgency: z.string(), // データ管理機関
  rorId: z.string().nullable().optional(), // データ管理機関コード (ROR ID)
  dataManager: z.string(), // データ管理者 (部署名等)
  dataManagerContact: z.string(), // データ管理者の連絡先
  dataStorageLocation: z.string().nullable().optional(), // 研究データの保存場所 (研究事業終了後)
  dataStoragePeriod: z.string().nullable().optional(), // 研究データの保存期間 (研究事業終了後)

  // for linking with GRDM
  linkedGrdmFiles: z.array(fileNodeSchema),
})
export type DataInfo = z.infer<typeof dataInfoSchema>

export const linkedGrdmProjectSchema = z.object({
  projectId: z.string(), // GRDM Project ID
})
export type LinkedGrdmProject = z.infer<typeof linkedGrdmProjectSchema>

// DMP 全体の型
export const dmpSchema = z.object({
  metadata: dmpMetadataSchema,
  projectInfo: projectInfoSchema,
  personInfo: z.array(personInfoSchema),
  dataInfo: z.array(dataInfoSchema),
  linkedGrdmProjects: z.array(linkedGrdmProjectSchema),
})
export type Dmp = z.infer<typeof dmpSchema>

export interface DmpFormValues {
  dmp: Dmp
}

// === Initial values ===

export const initDmp = (user: User | null | undefined = null): Dmp => {
  const personInfo: PersonInfo[] = user ? [{
    role: ["研究代表者"],
    lastName: user.familyNameJa ?? user.familyName,
    firstName: user.givenNameJa ?? user.givenName,
    eRadResearcherId: user.researcherId ?? "",
    orcid: user.orcid ?? "",
    affiliation: user.affiliation ?? "",
  }] : []

  return {
    metadata: {
      revisionType: "新規",
      submissionDate: todayString(),
      dateCreated: todayString(),
      dateModified: todayString(),
      researchPhase: "計画時",
    },
    projectInfo: {
      fundingAgency: "",
      programName: "",
      programCode: "",
      projectCode: "",
      projectName: "",
      adoptionYear: "",
      startYear: "",
      endYear: "",
    },
    personInfo,
    dataInfo: [],
    linkedGrdmProjects: [],
  }
}

// for Form initialization
export const initPersonInfo = (): PersonInfo => {
  return {
    role: [],
    lastName: "",
    firstName: "",
    eRadResearcherId: undefined,
    orcid: undefined,
    affiliation: "",
    contact: undefined,
    grdmUserId: undefined,
    source: undefined,
  }
}

// for Form initialization
export const initDataInfo = (): DataInfo => {
  return {
    dataName: "",
    publicationDate: undefined,
    description: "",
    acquisitionMethod: undefined,
    researchField: "ライフサイエンス",
    dataType: "データセット",
    dataSize: undefined,
    reuseInformation: undefined,
    hasSensitiveData: undefined,
    sensitiveDataPolicy: undefined,
    usagePolicy: "",
    repositoryInformation: "",
    backupLocation: undefined,
    publicationPolicy: undefined,
    accessRights: "公開",
    plannedPublicationDate: undefined,
    repository: undefined,
    dataCreator: undefined,
    dataManagementAgency: "",
    rorId: undefined,
    dataManager: "",
    dataManagerContact: "",
    dataStorageLocation: undefined,
    dataStoragePeriod: undefined,
    linkedGrdmFiles: [],
  }
}

// === Utility functions ===

export const listingPersonNames = (dmp: Dmp): string[] => {
  return dmp.personInfo.map(person => `${person.lastName} ${person.firstName}`.trim())
}

export const todayString = (): string => {
  // YYYY-MM-DD
  return new Date().toISOString().split("T")[0]
}
