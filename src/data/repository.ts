import type { KnowledgeNote, NoteAttachment, NoteInput, NoteVersion, UploadCandidate } from "../types";

export class VersionConflictError extends Error {
  constructor() {
    super("別の端末または画面でノートが更新されています。最新版を読み直してください。");
    this.name = "VersionConflictError";
  }
}

export interface NoteRepository {
  listNotes(): Promise<KnowledgeNote[]>;
  getNote(id: string): Promise<KnowledgeNote | null>;
  createNote(input: NoteInput): Promise<KnowledgeNote>;
  updateNote(id: string, input: NoteInput): Promise<KnowledgeNote>;
  toggleFavorite(id: string, favorite: boolean, expectedVersion: number): Promise<KnowledgeNote>;
  uploadAttachment(noteId: string, candidate: UploadCandidate): Promise<void>;
  deleteAttachment(attachment: NoteAttachment): Promise<void>;
  listVersions(noteId: string): Promise<NoteVersion[]>;
  restoreVersion(noteId: string, versionId: string, expectedVersion: number): Promise<KnowledgeNote>;
}
