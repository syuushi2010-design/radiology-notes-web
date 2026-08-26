import { ArrowLeft, CalendarDays, Check, Copy, Edit3, ExternalLink, Heart, History, Image as ImageIcon, RotateCcw, Search } from "lucide-react";
import { useEffect, useState } from "react";
import ReactMarkdown from "react-markdown";
import { Link, useParams } from "react-router-dom";
import remarkGfm from "remark-gfm";
import { useKnowledgeBase } from "../app/KnowledgeBaseContext";
import { NoteCard } from "../components/NoteCard";
import { StatusBadge } from "../components/StatusBadge";
import type { NoteAttachment, NoteVersion, RightsStatus } from "../types";

const rightsLabels: Record<RightsStatus, string> = {
  reusable: "再利用可",
  private_unconfirmed: "私的参照・条件未確認",
  link_only: "リンクのみ",
  ai_generated: "AI作成模式図",
};

export function NoteDetailPage() {
  const { id } = useParams();
  const { notes, loading, offline, markViewed, toggleFavorite, getVersions, restoreVersion } = useKnowledgeBase();
  const note = notes.find((item) => item.id === id);
  const [versions, setVersions] = useState<NoteVersion[]>([]);
  const [historyLoading, setHistoryLoading] = useState(false);
  const [historyError, setHistoryError] = useState<string>();
  const [restoringId, setRestoringId] = useState<string>();
  const [researchFocus, setResearchFocus] = useState("");
  const [researchCopyState, setResearchCopyState] = useState<"idle" | "copied" | "failed">("idle");

  useEffect(() => {
    if (note) markViewed(note.id);
  }, [markViewed, note]);

  useEffect(() => {
    if (!note || offline) return;
    let active = true;
    setVersions([]);
    setHistoryLoading(true);
    setHistoryError(undefined);
    void getVersions(note.id).then((items) => {
      if (active) setVersions(items);
    }).catch((cause) => {
      if (active) setHistoryError(cause instanceof Error ? cause.message : "変更履歴を取得できませんでした。");
    }).finally(() => {
      if (active) setHistoryLoading(false);
    });
    return () => { active = false; };
  }, [getVersions, note?.id, note?.version, offline]);

  if (loading) return <main className="main-content page-content"><p className="loading-message">ノートを読み込んでいます…</p></main>;
  if (!note) return <main className="main-content page-content"><p className="empty-state">ノートが見つかりません。</p></main>;

  const related = notes.filter((item) => item.id !== note.id && item.publicationStatus !== "archived" && hasOverlap(note.tags, item.tags)).slice(0, 2);
  const inlineAttachmentFileNames = getInlineAttachmentFileNames(note.body);
  const galleryAttachments = note.attachments.filter((attachment) => !inlineAttachmentFileNames.has(attachment.fileName));
  const researchPrompt = buildResearchPrompt(note.title, researchFocus);

  return (
    <main className="main-content detail-page">
      <div className="detail-toolbar">
        <Link className="text-button" to="/"><ArrowLeft size={17} />一覧へ</Link>
        <div>
          <button className="icon-button icon-button--bordered" type="button" aria-label={note.favorite ? "お気に入りから外す" : "お気に入りに登録"} onClick={() => void toggleFavorite(note)}><Heart size={18} fill={note.favorite ? "currentColor" : "none"} /></button>
          <Link className="secondary-button" to={`/notes/${note.id}/edit`}><Edit3 size={16} />編集</Link>
        </div>
      </div>

      <article className="detail-card">
        <header className="detail-header">
          <div className="detail-meta-row"><StatusBadge status={note.verificationStatus} /><span className="publication-label">{{ draft: "下書き", published: "公開", archived: "アーカイブ" }[note.publicationStatus]}</span><span className="version-label">v{note.version}</span></div>
          <h1>{note.title}</h1>
          <p>{note.summary}</p>
          <div className="detail-taxonomy">
            {[...note.modalities, ...note.bodyRegions, ...note.themes, ...note.tags].map((label) => <span key={label}>{label}</span>)}
          </div>
          <div className="detail-dates"><CalendarDays size={15} /><time dateTime={note.updatedAt}>{formatDate(note.updatedAt)}更新</time>{note.checkedAt && <span>・最終確認 {formatDate(note.checkedAt)}</span>}</div>
        </header>

        {galleryAttachments.length > 0 && (
          <section className="attachment-gallery" aria-label="参考画像">
            {galleryAttachments.map((attachment) => (
              <figure key={attachment.id}>
                {attachment.displayUrl ? <img src={attachment.displayUrl} alt={attachment.altText} /> : <div className="image-placeholder"><ImageIcon size={26} />画像を取得できません</div>}
                <figcaption><span>{rightsLabels[attachment.rightsStatus]}</span>{attachment.altText}</figcaption>
                {safeExternalUrl(attachment.sourcePageUrl) && <a href={attachment.sourcePageUrl} target="_blank" rel="noreferrer">出典ページ<ExternalLink size={13} /></a>}
              </figure>
            ))}
          </section>
        )}

        <div className="markdown-body"><ReactMarkdown remarkPlugins={[remarkGfm]} components={{
          img({ src, alt }) {
            const attachment = getInlineAttachment(note.attachments, src);
            if (!attachment) return <img src={src} alt={alt ?? ""} />;
            return <figure className="inline-attachment-figure">
              {attachment.displayUrl ? <img src={attachment.displayUrl} alt={alt || attachment.altText} /> : <div className="image-placeholder"><ImageIcon size={26} />画像を取得できません</div>}
              <figcaption><span>{rightsLabels[attachment.rightsStatus]}</span>{attachment.altText}</figcaption>
            </figure>;
          },
        }}>{note.body}</ReactMarkdown></div>

        <section className="research-section" aria-label="詳しく調べる">
          <details>
            <summary><span><Search size={17} />詳しく調べる</span><small>気になった点を深掘り</small></summary>
            <p className="research-help">ここでは調査や外部送信を自動実行しません。気になる点を入力して、Codexへ送る依頼文をコピーできます。</p>
            <label className="research-focus"><span>気になったところ（任意）</span><input value={researchFocus} onChange={(event) => { setResearchFocus(event.target.value); setResearchCopyState("idle"); }} placeholder="例：KL-6とCT所見の関係" /></label>
            <div className="research-prompt">
              <p>{researchPrompt}</p>
              <button className="secondary-button" type="button" onClick={() => void handleResearchPromptCopy()}>{researchCopyState === "copied" ? <Check size={15} /> : <Copy size={15} />}{researchCopyState === "copied" ? "コピーしました" : "依頼文をコピー"}</button>
            </div>
            {researchCopyState === "failed" && <p className="error-message" role="alert">コピーできませんでした。依頼文を選択してコピーしてください。</p>}
          </details>
        </section>

        <aside className="clinical-note"><strong>参照時の注意</strong><p>撮影条件や範囲は、所属施設の正式プロトコル、装置、検査目的、患者条件を優先してください。</p></aside>

        <section className="sources-section">
          <div className="section-heading section-heading--small"><div><p className="section-kicker">REFERENCES</p><h2>出典・参考資料</h2></div><span>{note.sources.length}件</span></div>
          {note.sources.length > 0 ? <ol className="source-list">{note.sources.map((source, index) => (
            <li key={source.id ?? `${source.url}-${index}`}>
              <div><strong>{source.title}</strong><p>{source.publisher}{source.usedFor ? ` ・ ${source.usedFor}` : ""}</p></div>
              {safeExternalUrl(source.url) && <a href={source.url} target="_blank" rel="noreferrer" aria-label={`${source.title}を開く`}><ExternalLink size={16} /></a>}
            </li>
          ))}</ol> : <p className="subtle-message">出典はまだ登録されていません。</p>}
        </section>

        <section className="version-section">
          <details>
            <summary><span><History size={17} />変更履歴</span><small>{versions.length}件</small></summary>
            <p className="version-help">過去版を復元すると新しい版として保存されます。出典と画像は現在の状態を維持し、確認区分は「本人編集」へ戻ります。</p>
            {historyLoading ? <p className="subtle-message">履歴を読み込んでいます…</p> : historyError ? <p className="error-message">{historyError}</p> : versions.length > 0 ? (
              <ol className="version-list">{versions.map((version) => (
                <li key={version.id}>
                  <div><strong>v{version.version}　{version.snapshot.title}</strong><time dateTime={version.createdAt}>{formatDateTime(version.createdAt)}</time></div>
                  <button className="secondary-button" type="button" disabled={offline || Boolean(restoringId)} onClick={() => void handleRestore(version)}><RotateCcw size={14} />{restoringId === version.id ? "復元中…" : "この版を復元"}</button>
                </li>
              ))}</ol>
            ) : <p className="subtle-message">変更履歴はまだありません。</p>}
          </details>
        </section>
      </article>

      {related.length > 0 && <section className="related-section"><h2>関連ノート</h2><div className="notes-grid notes-grid--two">{related.map((item) => <NoteCard key={item.id} note={item} onToggleFavorite={(target) => void toggleFavorite(target)} />)}</div></section>}
    </main>
  );

  async function handleRestore(version: NoteVersion) {
    if (!note || !window.confirm(`v${version.version}「${version.snapshot.title}」を復元しますか？`)) return;
    setRestoringId(version.id);
    setHistoryError(undefined);
    try {
      await restoreVersion(note, version.id);
    } catch (cause) {
      setHistoryError(cause instanceof Error ? cause.message : "過去版を復元できませんでした。");
    } finally {
      setRestoringId(undefined);
    }
  }

  async function handleResearchPromptCopy() {
    try {
      if (!navigator.clipboard?.writeText) throw new Error("Clipboard APIを利用できません。");
      await navigator.clipboard.writeText(researchPrompt);
      setResearchCopyState("copied");
    } catch {
      setResearchCopyState("failed");
    }
  }
}

function hasOverlap(left: string[], right: string[]) { return left.some((value) => right.includes(value)); }
function getInlineAttachmentFileNames(body: string) { return new Set([...body.matchAll(/https:\/\/attachment\.local\/([^\s)]+)/g)].map((match) => decodeURIComponent(match[1]))); }
function getInlineAttachment(attachments: NoteAttachment[], src?: string) {
  if (!src?.startsWith("https://attachment.local/")) return undefined;
  return attachments.find((attachment) => attachment.fileName === decodeURIComponent(src.slice("https://attachment.local/".length)));
}
function formatDate(value: string) { return new Intl.DateTimeFormat("ja-JP", { year: "numeric", month: "long", day: "numeric" }).format(new Date(value)); }
function formatDateTime(value: string) { return new Intl.DateTimeFormat("ja-JP", { year: "numeric", month: "numeric", day: "numeric", hour: "2-digit", minute: "2-digit" }).format(new Date(value)); }
function safeExternalUrl(value?: string) { if (!value) return false; try { return ["http:", "https:"].includes(new URL(value).protocol); } catch { return false; } }
function buildResearchPrompt(title: string, focus: string) {
  const subject = focus.trim() ? `「${focus.trim()}」を中心に` : "気になった点を中心に";
  return `「${title}」について、${subject}、公式資料と査読論文で詳しく調べて。放射線技師の学習・参照用として、適用条件、根拠、既存ノートへの追記案を整理し、登録前に内容と出典を提示して。`;
}
