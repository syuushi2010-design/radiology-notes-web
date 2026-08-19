import { readFile } from "node:fs/promises";
import path from "node:path";
import process from "node:process";
import { cleanFileName, getAdminClient, mediaTypeFor } from "./config.mjs";

const noteDirectory = process.argv[2];
if (!noteDirectory) {
  console.error("使い方: npm run sync:note -- content/notes/<note-folder>");
  process.exit(1);
}

const { client, ownerUserId } = getAdminClient();
const metadata = JSON.parse(await readFile(path.join(noteDirectory, "meta.json"), "utf8"));
const body = await readFile(path.join(noteDirectory, "note.md"), "utf8");
if (!metadata.title) throw new Error("meta.json の title は必須です。");

const id = metadata.id || crypto.randomUUID();
const verificationStatus = metadata.verificationStatus || "codex_verified";
const publicationStatus = metadata.publicationStatus || (verificationStatus === "needs_review" ? "draft" : "published");
const checkedAt = verificationStatus === "codex_verified" ? (metadata.checkedAt || new Date().toISOString().slice(0, 10)) : null;
if (!["codex_verified", "needs_review"].includes(verificationStatus)) throw new Error("Codex同期では verificationStatus を codex_verified または needs_review にしてください。");
if (verificationStatus === "codex_verified" && !metadata.sources?.length) throw new Error("Codex確認済みノートには1件以上の出典が必要です。");
if (verificationStatus === "needs_review" && publicationStatus !== "draft") throw new Error("要確認ノートは下書きとして同期してください。");
for (const source of metadata.sources || []) {
  if (!source.title || !isHttpUrl(source.url)) throw new Error("各出典には資料名と http(s) のURLが必要です。");
}

const noteRow = {
  id,
  user_id: ownerUserId,
  slug: metadata.slug || id,
  title: metadata.title,
  summary: metadata.summary || "",
  body,
  modalities: metadata.modalities || [],
  body_regions: metadata.bodyRegions || [],
  themes: metadata.themes || [],
  tags: metadata.tags || [],
  publication_status: publicationStatus,
  verification_status: verificationStatus,
  checked_at: checkedAt,
  favorite: Boolean(metadata.favorite),
};

const { data: current, error: currentError } = await client.from("notes").select("id,version").eq("id", id).eq("user_id", ownerUserId).maybeSingle();
if (currentError) throw currentError;
if (current) {
  if (!Number.isInteger(metadata.version)) throw new Error("既存ノートを同期するには meta.json の version が必要です。先にバックアップを書き出してください。");
  if (current.version !== metadata.version) throw new Error(`競合を検出しました。Supabaseはv${current.version}、meta.jsonはv${metadata.version}です。最新版を再取得して差分を確認してください。`);
  const { data: updated, error: updateError } = await client.from("notes").update(noteRow).eq("id", id).eq("user_id", ownerUserId).eq("version", metadata.version).select("id").maybeSingle();
  if (updateError) throw updateError;
  if (!updated) throw new Error("同期中に別の更新を検出しました。最新版を再取得してください。");
} else {
  const { error: insertError } = await client.from("notes").insert(noteRow);
  if (insertError) throw insertError;
}

const { error: sourceDeleteError } = await client.from("note_sources").delete().eq("note_id", id);
if (sourceDeleteError) throw sourceDeleteError;
if (metadata.sources?.length) {
  const { error } = await client.from("note_sources").insert(metadata.sources.map((source) => ({
    note_id: id,
    user_id: ownerUserId,
    title: source.title,
    publisher: source.publisher || null,
    url: source.url,
    source_type: source.sourceType || "reference",
    published_at: source.publishedAt || null,
    accessed_at: source.accessedAt || new Date().toISOString().slice(0, 10),
    used_for: source.usedFor || null,
    reliability: source.reliability || "reference",
  })));
  if (error) throw error;
}

for (const attachment of metadata.attachments || []) {
  if (attachment.rightsStatus === "link_only") throw new Error(`「リンクのみ」の画像は保存できません: ${attachment.file}`);
  if ((attachment.rightsStatus === "ai_generated") !== Boolean(attachment.isAiGenerated)) throw new Error(`AI生成の有無と権利状態を一致させてください: ${attachment.file}`);
  if (!attachment.isAiGenerated && (!isHttpUrl(attachment.sourcePageUrl) || !attachment.provider)) {
    throw new Error(`外部画像には元ページURLと提供元が必要です: ${attachment.file}`);
  }
  const localPath = path.join(noteDirectory, attachment.file);
  const fileBytes = await readFile(localPath);
  if (fileBytes.byteLength > 10 * 1024 * 1024) throw new Error(`画像は10MB以下にしてください: ${attachment.file}`);
  const fileName = cleanFileName(path.basename(attachment.file));
  const storagePath = `${ownerUserId}/${id}/${fileName}`;
  const mediaType = attachment.mediaType || mediaTypeFor(fileName);
  const { error: uploadError } = await client.storage.from("note-images").upload(storagePath, fileBytes, { contentType: mediaType, upsert: true });
  if (uploadError) throw uploadError;
  const { error: attachmentError } = await client.from("note_attachments").upsert({
    note_id: id,
    user_id: ownerUserId,
    file_name: path.basename(attachment.file),
    storage_path: storagePath,
    media_type: mediaType,
    source_page_url: attachment.sourcePageUrl || null,
    source_asset_url: attachment.sourceAssetUrl || null,
    provider: attachment.provider || null,
    acquired_at: attachment.acquiredAt || new Date().toISOString().slice(0, 10),
    rights_status: attachment.rightsStatus || "private_unconfirmed",
    license_terms: attachment.licenseTerms || null,
    is_ai_generated: Boolean(attachment.isAiGenerated),
    alt_text: attachment.altText || "",
  }, { onConflict: "note_id,storage_path" });
  if (attachmentError) throw attachmentError;
}

console.log(`同期完了: ${metadata.title} (${id})`);

function isHttpUrl(value) {
  if (!value) return false;
  try { return ["http:", "https:"].includes(new URL(value).protocol); } catch { return false; }
}
