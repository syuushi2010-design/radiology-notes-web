import { ArrowLeft, Bold, Edit3, ExternalLink, Eye, Heading2, ImagePlus, Italic, Link as LinkIcon, List, Plus, Save, Table2, Trash2 } from "lucide-react";
import { useEffect, useMemo, useRef, useState } from "react";
import ReactMarkdown from "react-markdown";
import { Link, useNavigate, useParams } from "react-router-dom";
import remarkGfm from "remark-gfm";
import { AttachmentUploadError, useKnowledgeBase } from "../app/KnowledgeBaseContext";
import { bodyRegions, modalities, themes, type NoteInput, type NoteSource, type RightsStatus, type UploadCandidate } from "../types";

const emptySource = (): NoteSource => ({ title: "", publisher: "", url: "", sourceType: "reference", accessedAt: new Date().toISOString().slice(0, 10), usedFor: "", reliability: "reference" });

export function NoteEditorPage() {
  const { id } = useParams();
  const { notes, loading, offline, saveNote, deleteAttachment } = useKnowledgeBase();
  const navigate = useNavigate();
  const existing = notes.find((note) => note.id === id);
  const [title, setTitle] = useState(existing?.title ?? "");
  const [summary, setSummary] = useState(existing?.summary ?? "");
  const [body, setBody] = useState(existing?.body ?? "## 要点\n\n");
  const [selectedModalities, setSelectedModalities] = useState<string[]>(existing?.modalities ?? []);
  const [selectedRegions, setSelectedRegions] = useState<string[]>(existing?.bodyRegions ?? []);
  const [selectedThemes, setSelectedThemes] = useState<string[]>(existing?.themes ?? []);
  const [tagsText, setTagsText] = useState(existing?.tags.join(", ") ?? "");
  const [publicationStatus, setPublicationStatus] = useState<NoteInput["publicationStatus"]>(existing?.publicationStatus ?? "draft");
  const [sources, setSources] = useState<NoteSource[]>(existing?.sources.length ? existing.sources : [emptySource()]);
  const [uploads, setUploads] = useState<UploadCandidate[]>([]);
  const [editorMode, setEditorMode] = useState<"write" | "preview">("write");
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState<string>();
  const textareaRef = useRef<HTMLTextAreaElement>(null);
  const initializedIdRef = useRef<string | undefined>(undefined);

  useEffect(() => {
    if (!existing || initializedIdRef.current === existing.id) return;
    initializedIdRef.current = existing.id;
    setTitle(existing.title);
    setSummary(existing.summary);
    setBody(existing.body);
    setSelectedModalities(existing.modalities);
    setSelectedRegions(existing.bodyRegions);
    setSelectedThemes(existing.themes);
    setTagsText(existing.tags.join(", "));
    setPublicationStatus(existing.publicationStatus);
    setSources(existing.sources.length ? existing.sources : [emptySource()]);
  }, [existing]);

  const backTarget = existing ? `/notes/${existing.id}` : "/";
  const canSave = useMemo(() => title.trim().length > 0 && body.trim().length > 0 && (!id || Boolean(existing)) && !loading && !saving && !offline, [body, existing, id, loading, offline, saving, title]);

  const applyMarkup = (before: string, after = "", placeholder = "テキスト") => {
    const textarea = textareaRef.current;
    if (!textarea) return;
    const start = textarea.selectionStart;
    const end = textarea.selectionEnd;
    const selected = body.slice(start, end) || placeholder;
    const next = `${body.slice(0, start)}${before}${selected}${after}${body.slice(end)}`;
    setBody(next);
    requestAnimationFrame(() => {
      textarea.focus();
      textarea.setSelectionRange(start + before.length, start + before.length + selected.length);
    });
  };

  const handleSave = async () => {
    if (!canSave) return;
    const completedSources = sources.filter((source) => source.title.trim() || source.url.trim());
    if (completedSources.some((source) => !source.title.trim() || !isHttpUrl(source.url))) {
      setError("出典には資料名と http(s) のURLを入力してください。");
      return;
    }
    if (uploads.some((upload) => !upload.altText.trim())) {
      setError("追加する画像には代替テキストを入力してください。");
      return;
    }
    if (uploads.some((upload) => (upload.sourcePageUrl && !isHttpUrl(upload.sourcePageUrl)) || (upload.sourceAssetUrl && !isHttpUrl(upload.sourceAssetUrl)))) {
      setError("画像の元ページURL・画像URLは http(s) 形式で入力してください。");
      return;
    }
    if (uploads.some((upload) => !upload.isAiGenerated && !upload.provider?.trim())) {
      setError("外部画像または本人作成画像には、著者・提供元を入力してください。");
      return;
    }
    setSaving(true);
    setError(undefined);
    try {
      const input: NoteInput = {
        title: title.trim(), summary: summary.trim(), body,
        modalities: selectedModalities, bodyRegions: selectedRegions, themes: selectedThemes,
        tags: tagsText.split(/[,、]/).map((tag) => tag.trim()).filter(Boolean),
        publicationStatus,
        verificationStatus: "self",
        favorite: existing?.favorite ?? false,
        sources: completedSources,
        expectedVersion: existing?.version,
      };
      const saved = await saveNote(existing?.id, input, uploads);
      navigate(`/notes/${saved.id}`);
    } catch (cause) {
      if (cause instanceof AttachmentUploadError) {
        setUploads([]);
        if (!existing) navigate(`/notes/${cause.savedNote.id}/edit`, { replace: true });
      }
      setError(cause instanceof Error ? cause.message : "保存できませんでした。");
    } finally { setSaving(false); }
  };

  if (id && loading) return <main className="main-content page-content"><p className="loading-message">ノートを読み込んでいます…</p></main>;
  if (id && !existing) return <main className="main-content page-content"><p className="empty-state">編集するノートが見つかりません。</p></main>;

  return (
    <main className="main-content editor-page">
      <div className="editor-toolbar-top">
        <Link className="text-button" to={backTarget}><ArrowLeft size={17} />戻る</Link>
        <div className="editor-actions">
          <select aria-label="公開状態" value={publicationStatus} onChange={(event) => setPublicationStatus(event.target.value as NoteInput["publicationStatus"])}>
            <option value="draft">下書き</option><option value="published">公開</option><option value="archived">アーカイブ</option>
          </select>
          <button className="primary-button" type="button" disabled={!canSave} onClick={() => void handleSave()}><Save size={16} />{saving ? "保存中…" : "保存"}</button>
        </div>
      </div>

      {offline && <p className="warning-message">オフライン中は編集内容を保存できません。</p>}
      {error && <p className="error-message">{error}</p>}

      <section className="editor-card">
        <label className="field field--title"><span>タイトル</span><input value={title} onChange={(event) => setTitle(event.target.value)} placeholder="例：頭部MRI Axial断面の設定基準" autoFocus /></label>
        <label className="field"><span>要約</span><textarea value={summary} onChange={(event) => setSummary(event.target.value)} rows={2} placeholder="一覧で内容が分かる短い要約" /></label>

        <div className="field"><span>本文</span><div className="markdown-toolbar" aria-label="本文の書式">
          <div className="markdown-format-actions">
            <button type="button" aria-label="見出し" disabled={editorMode === "preview"} onClick={() => applyMarkup("## ", "", "見出し")}><Heading2 size={17} /></button>
            <button type="button" aria-label="太字" disabled={editorMode === "preview"} onClick={() => applyMarkup("**", "**")}><Bold size={17} /></button>
            <button type="button" aria-label="斜体" disabled={editorMode === "preview"} onClick={() => applyMarkup("*", "*")}><Italic size={17} /></button>
            <button type="button" aria-label="箇条書き" disabled={editorMode === "preview"} onClick={() => applyMarkup("- ", "", "項目")}><List size={17} /></button>
            <button type="button" aria-label="リンク" disabled={editorMode === "preview"} onClick={() => applyMarkup("[", "](https://)", "リンク名")}><LinkIcon size={17} /></button>
            <button type="button" aria-label="表" disabled={editorMode === "preview"} onClick={() => applyMarkup("| 項目 | 内容 |\n| --- | --- |\n| ", " |\n", "値")}><Table2 size={17} /></button>
          </div>
          <div className="markdown-mode-switch" aria-label="本文の表示切替">
            <button className={editorMode === "write" ? "active" : ""} type="button" onClick={() => setEditorMode("write")}><Edit3 size={14} />編集</button>
            <button className={editorMode === "preview" ? "active" : ""} type="button" onClick={() => setEditorMode("preview")}><Eye size={14} />プレビュー</button>
          </div>
        </div>{editorMode === "write" ? <textarea ref={textareaRef} className="body-editor" value={body} onChange={(event) => setBody(event.target.value)} rows={17} /> : <div className="body-preview markdown-body"><ReactMarkdown remarkPlugins={[remarkGfm]}>{body}</ReactMarkdown></div>}</div>

        <div className="taxonomy-editor">
          <TaxonomyGroup title="モダリティ" options={modalities} selected={selectedModalities} onChange={setSelectedModalities} />
          <TaxonomyGroup title="解剖部位" options={bodyRegions} selected={selectedRegions} onChange={setSelectedRegions} />
          <TaxonomyGroup title="テーマ" options={themes} selected={selectedThemes} onChange={setSelectedThemes} />
        </div>
        <label className="field"><span>自由タグ</span><input value={tagsText} onChange={(event) => setTagsText(event.target.value)} placeholder="Axial, AC-PC line（カンマ区切り）" /></label>
      </section>

      <section className="editor-card editor-section">
        <div className="editor-section__heading"><div><h2>出典・参考資料</h2><p>資料名と元URLをノートに残します。</p></div><button className="secondary-button" type="button" onClick={() => setSources((items) => [...items, emptySource()])}><Plus size={15} />追加</button></div>
        <div className="source-editor-list">{sources.map((source, index) => (
          <div className="source-editor" key={source.id ?? index}>
            <label className="field"><span>資料名</span><input value={source.title} onChange={(event) => updateSource(index, "title", event.target.value)} /></label>
            <label className="field"><span>発行元</span><input value={source.publisher} onChange={(event) => updateSource(index, "publisher", event.target.value)} /></label>
            <label className="field field--wide"><span>URL</span><div className="url-input"><ExternalLink size={15} /><input type="url" value={source.url} onChange={(event) => updateSource(index, "url", event.target.value)} placeholder="https://" /></div></label>
            <button className="icon-button" type="button" aria-label="出典を削除" onClick={() => setSources((items) => items.filter((_, itemIndex) => itemIndex !== index))}><Trash2 size={17} /></button>
            <details className="source-advanced">
              <summary>出典の詳細</summary>
              <div>
                <label className="field"><span>資料種別</span><input value={source.sourceType} onChange={(event) => updateSource(index, "sourceType", event.target.value)} placeholder="学会ガイドライン、論文など" /></label>
                <label className="field"><span>信頼性区分</span><select value={source.reliability} onChange={(event) => updateSource(index, "reliability", event.target.value)}><option value="primary">一次資料</option><option value="peer_reviewed">査読論文</option><option value="official">公的・公式</option><option value="reference">参考資料</option><option value="unverified">未確認</option></select></label>
                <label className="field"><span>公開・更新日</span><input type="date" value={source.publishedAt ?? ""} onChange={(event) => updateSource(index, "publishedAt", event.target.value)} /></label>
                <label className="field"><span>参照日</span><input type="date" value={source.accessedAt} onChange={(event) => updateSource(index, "accessedAt", event.target.value)} /></label>
                <label className="field field--wide"><span>使用した箇所</span><input value={source.usedFor} onChange={(event) => updateSource(index, "usedFor", event.target.value)} placeholder="例：撮影範囲の根拠" /></label>
              </div>
            </details>
          </div>
        ))}</div>
      </section>

      <section className="editor-card editor-section">
        <div className="editor-section__heading"><div><h2>画像</h2><p>本人専用の非公開ストレージへ保存します。</p></div><label className="secondary-button file-button"><ImagePlus size={16} />画像を選択<input type="file" accept="image/jpeg,image/png,image/webp" multiple onChange={(event) => addFiles(event.target.files)} /></label></div>
        {existing && existing.attachments.length > 0 && <div className="existing-attachments"><div className="existing-attachments__heading"><strong>登録済み画像</strong><span>{existing.attachments.length}件</span></div>{existing.attachments.map((attachment) => <article key={attachment.id}>{attachment.displayUrl ? <img src={attachment.displayUrl} alt="" /> : <ImagePlus size={22} />}<div><strong>{attachment.fileName}</strong><span>{attachment.altText || "代替テキスト未入力"}</span></div><button className="icon-button" type="button" disabled={offline} aria-label={`${attachment.fileName}を削除`} onClick={() => void removeExistingAttachment(attachment)}><Trash2 size={17} /></button></article>)}</div>}
        {uploads.length === 0 ? <p className="subtle-message">新しく追加する画像はありません。</p> : <div className="upload-list">{uploads.map((upload, index) => (
          <div className="upload-item" key={`${upload.file.name}-${index}`}>
            <div className="upload-item__name"><ImagePlus size={17} /><strong>{upload.file.name}</strong><span>{formatBytes(upload.file.size)}</span></div>
            <label className="field"><span>代替テキスト</span><input value={upload.altText} onChange={(event) => updateUpload(index, "altText", event.target.value)} placeholder="画像の内容" /></label>
            <label className="field"><span>元ページURL</span><input type="url" value={upload.sourcePageUrl ?? ""} onChange={(event) => updateUpload(index, "sourcePageUrl", event.target.value)} placeholder="https://" /></label>
            <label className="field"><span>画像URL</span><input type="url" value={upload.sourceAssetUrl ?? ""} onChange={(event) => updateUpload(index, "sourceAssetUrl", event.target.value)} placeholder="https://" /></label>
            <label className="field"><span>著者・提供元</span><input value={upload.provider ?? ""} onChange={(event) => updateUpload(index, "provider", event.target.value)} /></label>
            <label className="field"><span>権利状態</span><select value={upload.rightsStatus} onChange={(event) => updateUploadRights(index, event.target.value as RightsStatus)}><option value="private_unconfirmed">私的参照・条件未確認</option><option value="reusable">再利用可</option><option value="ai_generated">AI作成模式図</option></select></label>
            <label className="field"><span>ライセンス・利用条件</span><input value={upload.licenseTerms ?? ""} onChange={(event) => updateUpload(index, "licenseTerms", event.target.value)} placeholder="CC BY 4.0 など" /></label>
            <button className="icon-button" type="button" aria-label="画像を削除" onClick={() => setUploads((items) => items.filter((_, itemIndex) => itemIndex !== index))}><Trash2 size={17} /></button>
          </div>
        ))}</div>}
      </section>
    </main>
  );

  function updateSource(index: number, key: keyof NoteSource, value: string) { setSources((items) => items.map((item, itemIndex) => itemIndex === index ? { ...item, [key]: value } : item)); }
  function updateUpload(index: number, key: keyof UploadCandidate, value: string | RightsStatus) { setUploads((items) => items.map((item, itemIndex) => itemIndex === index ? { ...item, [key]: value } : item)); }
  function updateUploadRights(index: number, rightsStatus: RightsStatus) { setUploads((items) => items.map((item, itemIndex) => itemIndex === index ? { ...item, rightsStatus, isAiGenerated: rightsStatus === "ai_generated" } : item)); }
  function addFiles(files: FileList | null) {
    if (!files) return;
    const selectedFiles = Array.from(files);
    const rejected = selectedFiles.filter((file) => !["image/jpeg", "image/png", "image/webp"].includes(file.type) || file.size > 10 * 1024 * 1024);
    if (rejected.length > 0) setError("JPEG・PNG・WebPの10MB以下の画像だけ追加できます。");
    const candidates: UploadCandidate[] = selectedFiles.filter((file) => !rejected.includes(file)).map((file) => ({ file, rightsStatus: "private_unconfirmed", isAiGenerated: false, altText: "" }));
    setUploads((items) => [...items, ...candidates]);
  }
  async function removeExistingAttachment(attachment: NonNullable<typeof existing>["attachments"][number]) {
    if (!window.confirm(`「${attachment.fileName}」を削除しますか？`)) return;
    setError(undefined);
    try { await deleteAttachment(attachment); } catch (cause) { setError(cause instanceof Error ? cause.message : "画像を削除できませんでした。"); }
  }
}

function TaxonomyGroup({ title, options, selected, onChange }: { title: string; options: readonly string[]; selected: string[]; onChange: (value: string[]) => void }) {
  return <fieldset><legend>{title}</legend><div className="option-chips">{options.map((option) => <label key={option} className={selected.includes(option) ? "selected" : ""}><input type="checkbox" checked={selected.includes(option)} onChange={() => onChange(selected.includes(option) ? selected.filter((item) => item !== option) : [...selected, option])} />{option}</label>)}</div></fieldset>;
}

function formatBytes(value: number) { return value < 1024 * 1024 ? `${Math.ceil(value / 1024)}KB` : `${(value / 1024 / 1024).toFixed(1)}MB`; }
function isHttpUrl(value: string) { try { return ["http:", "https:"].includes(new URL(value).protocol); } catch { return false; } }
