export type VerificationStatus = "self" | "codex_verified" | "needs_review";
export type PublicationStatus = "draft" | "published" | "archived";
export type RightsStatus = "reusable" | "private_unconfirmed" | "link_only" | "ai_generated";

export interface NoteSource {
  id?: string;
  title: string;
  publisher: string;
  url: string;
  sourceType: string;
  publishedAt?: string;
  accessedAt: string;
  usedFor: string;
  reliability: "primary" | "peer_reviewed" | "official" | "reference" | "unverified";
}

export interface NoteAttachment {
  id: string;
  noteId: string;
  fileName: string;
  storagePath: string;
  displayUrl?: string;
  mediaType: string;
  sourcePageUrl?: string;
  sourceAssetUrl?: string;
  provider?: string;
  acquiredAt: string;
  rightsStatus: RightsStatus;
  licenseTerms?: string;
  isAiGenerated: boolean;
  altText: string;
}

export interface KnowledgeNote {
  id: string;
  slug: string;
  title: string;
  summary: string;
  body: string;
  modalities: string[];
  bodyRegions: string[];
  themes: string[];
  tags: string[];
  verificationStatus: VerificationStatus;
  publicationStatus: PublicationStatus;
  checkedAt?: string;
  createdAt: string;
  updatedAt: string;
  version: number;
  favorite: boolean;
  sources: NoteSource[];
  attachments: NoteAttachment[];
}

export interface NoteVersionSnapshot {
  title: string;
  summary: string;
  body: string;
  modalities: string[];
  bodyRegions: string[];
  themes: string[];
  tags: string[];
  publicationStatus: PublicationStatus;
  verificationStatus: VerificationStatus;
  checkedAt?: string;
  favorite: boolean;
}

export interface NoteVersion {
  id: string;
  noteId: string;
  version: number;
  createdAt: string;
  snapshot: NoteVersionSnapshot;
}

export interface NoteInput {
  title: string;
  summary: string;
  body: string;
  modalities: string[];
  bodyRegions: string[];
  themes: string[];
  tags: string[];
  publicationStatus: PublicationStatus;
  verificationStatus: VerificationStatus;
  checkedAt?: string;
  favorite: boolean;
  sources: NoteSource[];
  expectedVersion?: number;
}

export interface UploadCandidate {
  file: File;
  sourcePageUrl?: string;
  sourceAssetUrl?: string;
  provider?: string;
  rightsStatus: RightsStatus;
  licenseTerms?: string;
  isAiGenerated: boolean;
  altText: string;
}

export const modalities = ["一般撮影", "CT", "MRI", "透視", "血管撮影", "核医学", "放射線治療", "超音波", "その他"] as const;
export const bodyRegions = ["頭部・脳", "頭頸部", "副鼻腔", "脊椎", "胸部", "腹部", "骨盤", "上肢", "下肢", "血管", "全身", "その他"] as const;
export const themes = ["解剖", "ポジショニング", "撮影断面・スライス設定", "撮影範囲", "撮影法・プロトコル", "画像所見", "疾患", "安全管理", "被ばく", "造影剤", "装置", "アーチファクト", "その他"] as const;
