import { Archive, CircleAlert, Clock3, Heart } from "lucide-react";
import type { ReactNode } from "react";
import { NoteCard } from "../components/NoteCard";
import { useKnowledgeBase } from "../app/KnowledgeBaseContext";

export function FavoritesPage() {
  const { notes, recentlyViewedIds, lastSyncedAt, toggleFavorite } = useKnowledgeBase();
  const favorites = notes.filter((note) => note.favorite && note.publicationStatus !== "archived");
  const recent = recentlyViewedIds
    .map((id) => notes.find((note) => note.id === id))
    .filter((note): note is (typeof notes)[number] => Boolean(note) && note?.publicationStatus !== "archived");
  return (
    <main className="main-content page-content">
      <header className="page-header">
        <span className="page-header__icon"><Heart size={22} /></span>
        <div><h1>保存済み</h1><p>お気に入りと最近見たノートは、同期後にオフラインでも参照できます。{lastSyncedAt ? ` 最終同期 ${formatDateTime(lastSyncedAt)}` : ""}</p></div>
      </header>
      <CollectionSection title="お気に入り" icon={<Heart size={18} />} notes={favorites} empty="お気に入りはまだありません。" onToggleFavorite={(note) => void toggleFavorite(note)} />
      <CollectionSection title="最近見たノート" icon={<Clock3 size={18} />} notes={recent} empty="ノートを開くと、ここに履歴が表示されます。" onToggleFavorite={(note) => void toggleFavorite(note)} />
    </main>
  );
}

export function ReviewPage() {
  const { notes, toggleFavorite } = useKnowledgeBase();
  const reviewNotes = notes.filter((note) => note.verificationStatus === "needs_review" && note.publicationStatus !== "archived");
  return <CollectionPage title="要確認" description="根拠不足・出典の食い違い・権利状態など、確認が必要なノートです。" icon={<CircleAlert size={22} />} notes={reviewNotes} onToggleFavorite={(note) => void toggleFavorite(note)} />;
}

export function ArchivePage() {
  const { notes, toggleFavorite } = useKnowledgeBase();
  const archived = notes.filter((note) => note.publicationStatus === "archived");
  return <CollectionPage title="アーカイブ" description="保管中のノートです。編集画面から下書き・公開へ戻せます。" icon={<Archive size={22} />} notes={archived} onToggleFavorite={(note) => void toggleFavorite(note)} />;
}

function CollectionPage({ title, description, icon, notes, onToggleFavorite }: { title: string; description: string; icon: ReactNode; notes: ReturnType<typeof useKnowledgeBase>["notes"]; onToggleFavorite: (note: ReturnType<typeof useKnowledgeBase>["notes"][number]) => void }) {
  return (
    <main className="main-content page-content">
      <header className="page-header">
        <span className="page-header__icon">{icon}</span>
        <div><h1>{title}</h1><p>{description}</p></div>
      </header>
      {notes.length > 0 ? <div className="notes-grid">{notes.map((note) => <NoteCard key={note.id} note={note} onToggleFavorite={onToggleFavorite} />)}</div> : <p className="empty-state">該当するノートはまだありません。</p>}
    </main>
  );
}

function CollectionSection({ title, icon, notes, empty, onToggleFavorite }: { title: string; icon: ReactNode; notes: ReturnType<typeof useKnowledgeBase>["notes"]; empty: string; onToggleFavorite: (note: ReturnType<typeof useKnowledgeBase>["notes"][number]) => void }) {
  return (
    <section className="collection-section">
      <h2>{icon}{title}<span>{notes.length}件</span></h2>
      {notes.length > 0 ? <div className="notes-grid">{notes.map((note) => <NoteCard key={note.id} note={note} onToggleFavorite={onToggleFavorite} />)}</div> : <p className="empty-state">{empty}</p>}
    </section>
  );
}

function formatDateTime(value: string) {
  return new Intl.DateTimeFormat("ja-JP", { month: "numeric", day: "numeric", hour: "2-digit", minute: "2-digit" }).format(new Date(value));
}
