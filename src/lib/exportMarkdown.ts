import type { KnowledgeNote } from "../types";

export function downloadNotesAsMarkdown(notes: KnowledgeNote[]) {
  const exportedAt = new Date();
  const sections = notes.map((note) => renderNote(note));
  const document = [
    "# 放射線技師ナレッジノート バックアップ",
    "",
    `書き出し日時: ${exportedAt.toLocaleString("ja-JP")}`,
    `ノート数: ${notes.length}`,
    "",
    "> このファイルには画像本体を含みません。完全バックアップはローカルの `npm run backup:export` を使ってください。",
    "",
    ...sections,
  ].join("\n");
  const blob = new Blob([document], { type: "text/markdown;charset=utf-8" });
  const url = URL.createObjectURL(blob);
  const anchor = window.document.createElement("a");
  anchor.href = url;
  anchor.download = `radiology-notes-${exportedAt.toISOString().slice(0, 10)}.md`;
  anchor.click();
  URL.revokeObjectURL(url);
}

function renderNote(note: KnowledgeNote) {
  const sources = note.sources.length > 0
    ? note.sources.map((source) => `- [${escapeLabel(source.title)}](${source.url}) — ${source.publisher || "発行元未入力"}（参照日: ${source.accessedAt}）`).join("\n")
    : "- なし";
  const attachments = note.attachments.length > 0
    ? note.attachments.map((attachment) => `- ${attachment.fileName} / ${attachment.rightsStatus}${attachment.sourcePageUrl ? ` / ${attachment.sourcePageUrl}` : ""}（画像本体は未収録）`).join("\n")
    : "- なし";
  return [
    "---",
    "",
    `# ${note.title}`,
    "",
    `- ID: ${note.id}`,
    `- 状態: ${note.publicationStatus}`,
    `- 確認区分: ${note.verificationStatus}`,
    `- 版: ${note.version}`,
    `- 更新日時: ${note.updatedAt}`,
    `- モダリティ: ${note.modalities.join(", ") || "未分類"}`,
    `- 解剖部位: ${note.bodyRegions.join(", ") || "未分類"}`,
    `- テーマ: ${note.themes.join(", ") || "未分類"}`,
    `- タグ: ${note.tags.join(", ") || "なし"}`,
    "",
    note.summary,
    "",
    note.body,
    "",
    "## 出典",
    "",
    sources,
    "",
    "## 画像メタデータ",
    "",
    attachments,
    "",
  ].join("\n");
}

function escapeLabel(value: string) {
  return value.replaceAll("[", "\\[").replaceAll("]", "\\]");
}
