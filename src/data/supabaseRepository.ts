import type { SupabaseClient } from "@supabase/supabase-js";
import type { KnowledgeNote, NoteAttachment, NoteInput, NoteSource, NoteVersion, UploadCandidate } from "../types";
import type { NoteRepository } from "./repository";
import { VersionConflictError } from "./repository";

interface SourceRow {
  id: string;
  title: string;
  publisher: string | null;
  url: string;
  source_type: string;
  published_at: string | null;
  accessed_at: string;
  used_for: string | null;
  reliability: NoteSource["reliability"];
}

interface AttachmentRow {
  id: string;
  note_id: string;
  file_name: string;
  storage_path: string;
  media_type: string;
  source_page_url: string | null;
  source_asset_url: string | null;
  provider: string | null;
  acquired_at: string;
  rights_status: NoteAttachment["rightsStatus"];
  license_terms: string | null;
  is_ai_generated: boolean;
  alt_text: string;
}

interface NoteRow {
  id: string;
  slug: string;
  title: string;
  summary: string;
  body: string;
  modalities: string[];
  body_regions: string[];
  themes: string[];
  tags: string[];
  verification_status: KnowledgeNote["verificationStatus"];
  publication_status: KnowledgeNote["publicationStatus"];
  checked_at: string | null;
  created_at: string;
  updated_at: string;
  version: number;
  favorite: boolean;
  note_sources?: SourceRow[];
  note_attachments?: AttachmentRow[];
}

interface VersionSnapshotRow {
  title: string;
  summary: string;
  body: string;
  modalities: string[];
  body_regions: string[];
  themes: string[];
  tags: string[];
  publication_status: KnowledgeNote["publicationStatus"];
  verification_status: KnowledgeNote["verificationStatus"];
  checked_at: string | null;
  favorite: boolean;
}

interface VersionRow {
  id: number | string;
  note_id: string;
  version: number;
  snapshot: VersionSnapshotRow;
  created_at: string;
}

const noteSelect = "*, note_sources(*), note_attachments(*)";

export class SupabaseNoteRepository implements NoteRepository {
  constructor(private readonly client: SupabaseClient) {}

  async listNotes() {
    const { data, error } = await this.client.from("notes").select(noteSelect).order("updated_at", { ascending: false });
    if (error) throw error;
    return Promise.all((data as NoteRow[]).map((row) => this.toNote(row)));
  }

  async getNote(id: string) {
    const { data, error } = await this.client.from("notes").select(noteSelect).eq("id", id).maybeSingle();
    if (error) throw error;
    return data ? this.toNote(data as NoteRow) : null;
  }

  async createNote(input: NoteInput) {
    const { data, error } = await this.client.from("notes").insert(toNoteRow(input)).select("id").single();
    if (error) throw error;
    await this.replaceSources(data.id as string, input.sources);
    const note = await this.getNote(data.id as string);
    if (!note) throw new Error("保存したノートを取得できませんでした。");
    return note;
  }

  async updateNote(id: string, input: NoteInput) {
    const { data, error } = await this.client
      .from("notes")
      .update({ ...toNoteRow(input), verification_status: "self" })
      .eq("id", id)
      .eq("version", input.expectedVersion)
      .select("id")
      .maybeSingle();
    if (error) throw error;
    if (!data) throw new VersionConflictError();
    await this.replaceSources(id, input.sources);
    const note = await this.getNote(id);
    if (!note) throw new Error("更新したノートを取得できませんでした。");
    return note;
  }

  async toggleFavorite(id: string, favorite: boolean, expectedVersion: number) {
    const { data, error } = await this.client
      .from("notes")
      .update({ favorite })
      .eq("id", id)
      .eq("version", expectedVersion)
      .select(noteSelect)
      .maybeSingle();
    if (error) throw error;
    if (!data) throw new VersionConflictError();
    return this.toNote(data as NoteRow);
  }

  async uploadAttachment(noteId: string, candidate: UploadCandidate) {
    const { data: userData, error: userError } = await this.client.auth.getUser();
    if (userError || !userData.user) throw userError ?? new Error("ログイン情報を取得できません。");
    const safeName = candidate.file.name.normalize("NFKC").replace(/[^\p{L}\p{N}._-]/gu, "-");
    const path = `${userData.user.id}/${noteId}/${crypto.randomUUID()}-${safeName}`;
    const { error: uploadError } = await this.client.storage.from("note-images").upload(path, candidate.file, {
      contentType: candidate.file.type,
      upsert: false,
    });
    if (uploadError) throw uploadError;
    const { error: metadataError } = await this.client.from("note_attachments").insert({
      note_id: noteId,
      file_name: candidate.file.name,
      storage_path: path,
      media_type: candidate.file.type,
      source_page_url: candidate.sourcePageUrl || null,
      source_asset_url: candidate.sourceAssetUrl || null,
      provider: candidate.provider || null,
      acquired_at: new Date().toISOString().slice(0, 10),
      rights_status: candidate.rightsStatus,
      license_terms: candidate.licenseTerms || null,
      is_ai_generated: candidate.isAiGenerated,
      alt_text: candidate.altText,
    });
    if (metadataError) {
      await this.client.storage.from("note-images").remove([path]);
      throw metadataError;
    }
  }

  async deleteAttachment(attachment: NoteAttachment) {
    const { error: metadataError } = await this.client.from("note_attachments").delete().eq("id", attachment.id).eq("note_id", attachment.noteId);
    if (metadataError) throw metadataError;
    const { error: storageError } = await this.client.storage.from("note-images").remove([attachment.storagePath]);
    if (storageError) throw new Error("画像情報は削除しましたが、ストレージ上のファイル削除に失敗しました。設定画面で確認してください。");
  }

  async listVersions(noteId: string): Promise<NoteVersion[]> {
    const { data, error } = await this.client
      .from("note_versions")
      .select("id,note_id,version,snapshot,created_at")
      .eq("note_id", noteId)
      .order("version", { ascending: false });
    if (error) throw error;
    return (data as VersionRow[]).map((row) => ({
      id: String(row.id),
      noteId: row.note_id,
      version: row.version,
      createdAt: row.created_at,
      snapshot: {
        title: row.snapshot.title,
        summary: row.snapshot.summary,
        body: row.snapshot.body,
        modalities: row.snapshot.modalities ?? [],
        bodyRegions: row.snapshot.body_regions ?? [],
        themes: row.snapshot.themes ?? [],
        tags: row.snapshot.tags ?? [],
        publicationStatus: row.snapshot.publication_status,
        verificationStatus: row.snapshot.verification_status,
        checkedAt: row.snapshot.checked_at ?? undefined,
        favorite: row.snapshot.favorite,
      },
    }));
  }

  async restoreVersion(noteId: string, versionId: string, expectedVersion: number) {
    const { data: versionData, error: versionError } = await this.client
      .from("note_versions")
      .select("snapshot")
      .eq("id", versionId)
      .eq("note_id", noteId)
      .maybeSingle();
    if (versionError) throw versionError;
    if (!versionData) throw new Error("復元する版が見つかりません。");
    const snapshot = versionData.snapshot as VersionSnapshotRow;
    const { data, error } = await this.client
      .from("notes")
      .update({
        title: snapshot.title,
        summary: snapshot.summary,
        body: snapshot.body,
        modalities: snapshot.modalities ?? [],
        body_regions: snapshot.body_regions ?? [],
        themes: snapshot.themes ?? [],
        tags: snapshot.tags ?? [],
        publication_status: snapshot.publication_status,
        verification_status: "self",
        checked_at: null,
        favorite: snapshot.favorite,
      })
      .eq("id", noteId)
      .eq("version", expectedVersion)
      .select("id")
      .maybeSingle();
    if (error) throw error;
    if (!data) throw new VersionConflictError();
    const note = await this.getNote(noteId);
    if (!note) throw new Error("復元したノートを取得できませんでした。");
    return note;
  }

  private async replaceSources(noteId: string, sources: NoteSource[]) {
    const { error: deleteError } = await this.client.from("note_sources").delete().eq("note_id", noteId);
    if (deleteError) throw deleteError;
    if (sources.length === 0) return;
    const { error } = await this.client.from("note_sources").insert(sources.map((source) => ({
      note_id: noteId,
      title: source.title,
      publisher: source.publisher || null,
      url: source.url,
      source_type: source.sourceType,
      published_at: source.publishedAt || null,
      accessed_at: source.accessedAt,
      used_for: source.usedFor || null,
      reliability: source.reliability,
    })));
    if (error) throw error;
  }

  private async toNote(row: NoteRow): Promise<KnowledgeNote> {
    const attachments = await Promise.all((row.note_attachments ?? []).map(async (attachment): Promise<NoteAttachment> => {
      const { data } = await this.client.storage.from("note-images").createSignedUrl(attachment.storage_path, 60 * 60 * 24);
      return {
        id: attachment.id,
        noteId: attachment.note_id,
        fileName: attachment.file_name,
        storagePath: attachment.storage_path,
        displayUrl: data?.signedUrl,
        mediaType: attachment.media_type,
        sourcePageUrl: attachment.source_page_url ?? undefined,
        sourceAssetUrl: attachment.source_asset_url ?? undefined,
        provider: attachment.provider ?? undefined,
        acquiredAt: attachment.acquired_at,
        rightsStatus: attachment.rights_status,
        licenseTerms: attachment.license_terms ?? undefined,
        isAiGenerated: attachment.is_ai_generated,
        altText: attachment.alt_text,
      };
    }));
    return {
      id: row.id,
      slug: row.slug,
      title: row.title,
      summary: row.summary,
      body: row.body,
      modalities: row.modalities ?? [],
      bodyRegions: row.body_regions ?? [],
      themes: row.themes ?? [],
      tags: row.tags ?? [],
      verificationStatus: row.verification_status,
      publicationStatus: row.publication_status,
      checkedAt: row.checked_at ?? undefined,
      createdAt: row.created_at,
      updatedAt: row.updated_at,
      version: row.version,
      favorite: row.favorite,
      sources: (row.note_sources ?? []).map((source) => ({
        id: source.id,
        title: source.title,
        publisher: source.publisher ?? "",
        url: source.url,
        sourceType: source.source_type,
        publishedAt: source.published_at ?? undefined,
        accessedAt: source.accessed_at,
        usedFor: source.used_for ?? "",
        reliability: source.reliability,
      })),
      attachments,
    };
  }
}

function toNoteRow(input: NoteInput) {
  return {
    title: input.title,
    summary: input.summary,
    body: input.body,
    modalities: input.modalities,
    body_regions: input.bodyRegions,
    themes: input.themes,
    tags: input.tags,
    publication_status: input.publicationStatus,
    verification_status: input.verificationStatus,
    checked_at: input.checkedAt || null,
    favorite: input.favorite,
  };
}
