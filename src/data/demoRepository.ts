import { demoNotes } from "../demoData";
import type { KnowledgeNote, NoteAttachment, NoteInput, NoteVersion, UploadCandidate } from "../types";
import type { NoteRepository } from "./repository";
import { VersionConflictError } from "./repository";

const clone = <T,>(value: T): T => structuredClone(value);

export class DemoNoteRepository implements NoteRepository {
  private notes = clone(demoNotes);
  private versions = new Map<string, NoteVersion[]>();

  async listNotes() {
    return clone(this.notes).sort((a, b) => b.updatedAt.localeCompare(a.updatedAt));
  }

  async getNote(id: string) {
    return clone(this.notes.find((note) => note.id === id) ?? null);
  }

  async createNote(input: NoteInput) {
    const now = new Date().toISOString();
    const id = crypto.randomUUID();
    const note: KnowledgeNote = {
      id,
      slug: `${slugify(input.title)}-${id.slice(0, 6)}`,
      ...clone(input),
      createdAt: now,
      updatedAt: now,
      version: 1,
      attachments: [],
    };
    this.notes.unshift(note);
    return clone(note);
  }

  async updateNote(id: string, input: NoteInput) {
    const index = this.notes.findIndex((note) => note.id === id);
    if (index < 0) throw new Error("ノートが見つかりません。");
    if (input.expectedVersion !== this.notes[index].version) throw new VersionConflictError();
    this.captureVersion(this.notes[index]);
    this.notes[index] = {
      ...this.notes[index],
      ...clone(input),
      verificationStatus: "self",
      updatedAt: new Date().toISOString(),
      version: this.notes[index].version + 1,
    };
    return clone(this.notes[index]);
  }

  async toggleFavorite(id: string, favorite: boolean, expectedVersion: number) {
    const index = this.notes.findIndex((note) => note.id === id);
    if (index < 0) throw new Error("ノートが見つかりません。");
    if (expectedVersion !== this.notes[index].version) throw new VersionConflictError();
    this.captureVersion(this.notes[index]);
    this.notes[index] = {
      ...this.notes[index],
      favorite,
      updatedAt: new Date().toISOString(),
      version: this.notes[index].version + 1,
    };
    return clone(this.notes[index]);
  }

  async uploadAttachment(noteId: string, candidate: UploadCandidate) {
    const note = this.notes.find((item) => item.id === noteId);
    if (!note) throw new Error("ノートが見つかりません。");
    const attachment: NoteAttachment = {
      id: crypto.randomUUID(),
      noteId,
      fileName: candidate.file.name,
      storagePath: "demo-preview",
      displayUrl: URL.createObjectURL(candidate.file),
      mediaType: candidate.file.type,
      sourcePageUrl: candidate.sourcePageUrl,
      sourceAssetUrl: candidate.sourceAssetUrl,
      provider: candidate.provider,
      acquiredAt: new Date().toISOString().slice(0, 10),
      rightsStatus: candidate.rightsStatus,
      licenseTerms: candidate.licenseTerms,
      isAiGenerated: candidate.isAiGenerated,
      altText: candidate.altText,
    };
    note.attachments.push(attachment);
  }

  async deleteAttachment(attachment: NoteAttachment) {
    const note = this.notes.find((item) => item.id === attachment.noteId);
    if (!note) throw new Error("ノートが見つかりません。");
    note.attachments = note.attachments.filter((item) => item.id !== attachment.id);
    if (attachment.displayUrl?.startsWith("blob:")) URL.revokeObjectURL(attachment.displayUrl);
  }

  async listVersions(noteId: string) {
    return clone(this.versions.get(noteId) ?? []).sort((a, b) => b.version - a.version);
  }

  async restoreVersion(noteId: string, versionId: string, expectedVersion: number) {
    const index = this.notes.findIndex((note) => note.id === noteId);
    if (index < 0) throw new Error("ノートが見つかりません。");
    if (expectedVersion !== this.notes[index].version) throw new VersionConflictError();
    const version = (this.versions.get(noteId) ?? []).find((item) => item.id === versionId);
    if (!version) throw new Error("復元する版が見つかりません。");
    this.captureVersion(this.notes[index]);
    this.notes[index] = {
      ...this.notes[index],
      ...clone(version.snapshot),
      verificationStatus: "self",
      checkedAt: undefined,
      updatedAt: new Date().toISOString(),
      version: this.notes[index].version + 1,
    };
    return clone(this.notes[index]);
  }

  private captureVersion(note: KnowledgeNote) {
    const version: NoteVersion = {
      id: crypto.randomUUID(),
      noteId: note.id,
      version: note.version,
      createdAt: new Date().toISOString(),
      snapshot: {
        title: note.title,
        summary: note.summary,
        body: note.body,
        modalities: clone(note.modalities),
        bodyRegions: clone(note.bodyRegions),
        themes: clone(note.themes),
        tags: clone(note.tags),
        publicationStatus: note.publicationStatus,
        verificationStatus: note.verificationStatus,
        checkedAt: note.checkedAt,
        favorite: note.favorite,
      },
    };
    this.versions.set(note.id, [version, ...(this.versions.get(note.id) ?? [])]);
  }
}

function slugify(value: string) {
  return value
    .normalize("NFKC")
    .toLowerCase()
    .replace(/[^\p{L}\p{N}]+/gu, "-")
    .replace(/^-|-$/g, "") || "note";
}
