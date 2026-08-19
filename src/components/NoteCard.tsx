import { Heart } from "lucide-react";
import { Link } from "react-router-dom";
import type { KnowledgeNote } from "../types";
import { StatusBadge } from "./StatusBadge";

export function NoteCard({ note, onToggleFavorite }: { note: KnowledgeNote; onToggleFavorite: (note: KnowledgeNote) => void }) {
  return (
    <article className="note-card">
      <div className="note-card__topline">
        <span className="modality-pill">{note.modalities[0] ?? "未分類"}</span>
        <button
          className="icon-button"
          aria-label={`${note.title}を${note.favorite ? "お気に入りから外す" : "お気に入りに登録"}`}
          type="button"
          onClick={() => onToggleFavorite(note)}
        >
          <Heart aria-hidden="true" fill={note.favorite ? "currentColor" : "none"} size={19} />
        </button>
      </div>
      <Link className="note-card__link" to={`/notes/${note.id}`}>
        <h3>{note.title}</h3>
        <p>{note.summary}</p>
      </Link>
      <div className="tag-row" aria-label="分類">
        {[...note.bodyRegions, ...note.themes].slice(0, 3).map((label) => <span key={label}>{label}</span>)}
      </div>
      <div className="note-card__footer">
        <StatusBadge status={note.verificationStatus} />
        <time dateTime={note.updatedAt}>{formatShortDate(note.updatedAt)}更新</time>
      </div>
    </article>
  );
}

function formatShortDate(value: string) {
  return new Intl.DateTimeFormat("ja-JP", { month: "short", day: "numeric" }).format(new Date(value));
}
