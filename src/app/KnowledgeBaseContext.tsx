import { createContext, useCallback, useContext, useEffect, useMemo, useState, type ReactNode } from "react";
import type { NoteRepository } from "../data/repository";
import { readLastSyncedAt, readRecentlyViewedIds, recordLastSyncedAt, recordRecentlyViewed } from "../lib/localState";
import { readOfflineNotes, saveOfflineNotes } from "../lib/offlineStore";
import type { KnowledgeNote, NoteAttachment, NoteInput, NoteVersion, UploadCandidate } from "../types";

interface KnowledgeBaseValue {
  notes: KnowledgeNote[];
  loading: boolean;
  error?: string;
  offline: boolean;
  lastSyncedAt?: string;
  recentlyViewedIds: string[];
  refresh: () => Promise<void>;
  markViewed: (id: string) => void;
  saveNote: (id: string | undefined, input: NoteInput, uploads: UploadCandidate[]) => Promise<KnowledgeNote>;
  toggleFavorite: (note: KnowledgeNote) => Promise<void>;
  deleteAttachment: (attachment: NoteAttachment) => Promise<void>;
  getVersions: (noteId: string) => Promise<NoteVersion[]>;
  restoreVersion: (note: KnowledgeNote, versionId: string) => Promise<KnowledgeNote>;
}

const KnowledgeBaseContext = createContext<KnowledgeBaseValue | null>(null);

export class AttachmentUploadError extends Error {
  constructor(public readonly savedNote: KnowledgeNote, cause: unknown) {
    super(`ノート本体は保存しましたが、画像の追加に失敗しました。登録済み画像を確認して、必要な画像だけ追加し直してください。${cause instanceof Error ? `（${cause.message}）` : ""}`);
    this.name = "AttachmentUploadError";
  }
}

export function KnowledgeBaseProvider({ repository, children }: { repository: NoteRepository; children: ReactNode }) {
  const [notes, setNotes] = useState<KnowledgeNote[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string>();
  const [offline, setOffline] = useState(!navigator.onLine);
  const [lastSyncedAt, setLastSyncedAt] = useState<string | undefined>(() => readLastSyncedAt());
  const [recentlyViewedIds, setRecentlyViewedIds] = useState<string[]>(() => readRecentlyViewedIds());

  const refresh = useCallback(async () => {
    setLoading(true);
    setError(undefined);
    try {
      const nextNotes = await repository.listNotes();
      setNotes(nextNotes);
      const recentIds = readRecentlyViewedIds();
      setRecentlyViewedIds(recentIds);
      const offlineNotes = dedupeNotes([
        ...nextNotes.filter((note) => note.favorite),
        ...recentIds.map((id) => nextNotes.find((note) => note.id === id)).filter((note): note is KnowledgeNote => Boolean(note)),
      ]);
      await saveOfflineNotes(offlineNotes);
      const syncedAt = new Date().toISOString();
      recordLastSyncedAt(syncedAt);
      setLastSyncedAt(syncedAt);
      setOffline(false);
    } catch (cause) {
      const cached = await readOfflineNotes().catch(() => []);
      if (cached.length > 0) {
        setNotes(cached);
        setOffline(true);
      } else {
        setError(cause instanceof Error ? cause.message : "ノートを読み込めませんでした。");
      }
    } finally {
      setLoading(false);
    }
  }, [repository]);

  const markViewed = useCallback((id: string) => {
    const ids = recordRecentlyViewed(id);
    setRecentlyViewedIds(ids);
    const offlineNotes = dedupeNotes([
      ...notes.filter((note) => note.favorite),
      ...ids.map((noteId) => notes.find((note) => note.id === noteId)).filter((note): note is KnowledgeNote => Boolean(note)),
    ]);
    void saveOfflineNotes(offlineNotes);
  }, [notes]);

  useEffect(() => { void refresh(); }, [refresh]);

  useEffect(() => {
    const handleOnline = () => { setOffline(false); void refresh(); };
    const handleOffline = () => setOffline(true);
    window.addEventListener("online", handleOnline);
    window.addEventListener("offline", handleOffline);
    return () => {
      window.removeEventListener("online", handleOnline);
      window.removeEventListener("offline", handleOffline);
    };
  }, [refresh]);

  const saveNote = useCallback(async (id: string | undefined, input: NoteInput, uploads: UploadCandidate[]) => {
    if (offline) throw new Error("オフライン中は編集できません。");
    let saved = id ? await repository.updateNote(id, input) : await repository.createNote(input);
    try {
      for (const upload of uploads) await repository.uploadAttachment(saved.id, upload);
    } catch (cause) {
      await refresh();
      throw new AttachmentUploadError(saved, cause);
    }
    if (uploads.length > 0) saved = await repository.getNote(saved.id) ?? saved;
    await refresh();
    return saved;
  }, [offline, refresh, repository]);

  const toggleFavorite = useCallback(async (note: KnowledgeNote) => {
    if (offline) throw new Error("オフライン中はお気に入りを変更できません。");
    await repository.toggleFavorite(note.id, !note.favorite, note.version);
    await refresh();
  }, [offline, refresh, repository]);

  const getVersions = useCallback((noteId: string) => repository.listVersions(noteId), [repository]);

  const deleteAttachment = useCallback(async (attachment: NoteAttachment) => {
    if (offline) throw new Error("オフライン中は画像を削除できません。");
    try {
      await repository.deleteAttachment(attachment);
    } catch (cause) {
      await refresh();
      throw cause;
    }
    await refresh();
  }, [offline, refresh, repository]);

  const restoreVersion = useCallback(async (note: KnowledgeNote, versionId: string) => {
    if (offline) throw new Error("オフライン中は版を復元できません。");
    const restored = await repository.restoreVersion(note.id, versionId, note.version);
    await refresh();
    return restored;
  }, [offline, refresh, repository]);

  const value = useMemo(() => ({ notes, loading, error, offline, lastSyncedAt, recentlyViewedIds, refresh, markViewed, saveNote, toggleFavorite, deleteAttachment, getVersions, restoreVersion }), [notes, loading, error, offline, lastSyncedAt, recentlyViewedIds, refresh, markViewed, saveNote, toggleFavorite, deleteAttachment, getVersions, restoreVersion]);
  return <KnowledgeBaseContext.Provider value={value}>{children}</KnowledgeBaseContext.Provider>;
}

export function useKnowledgeBase() {
  const value = useContext(KnowledgeBaseContext);
  if (!value) throw new Error("KnowledgeBaseProviderが必要です。");
  return value;
}

function dedupeNotes(notes: KnowledgeNote[]) {
  return Array.from(new Map(notes.map((note) => [note.id, note])).values());
}
