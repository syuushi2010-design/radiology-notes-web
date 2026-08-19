import { mkdir, writeFile } from "node:fs/promises";
import path from "node:path";
import process from "node:process";
import { cleanFileName, getAdminClient } from "./config.mjs";

const { client, ownerUserId } = getAdminClient();
const date = new Date().toISOString().slice(0, 10);
const outputRoot = path.resolve(process.argv[2] || path.join("backups", date));
await mkdir(outputRoot, { recursive: true });

const { data, error } = await client
  .from("notes")
  .select("*, note_sources(*), note_attachments(*)")
  .eq("user_id", ownerUserId)
  .order("updated_at", { ascending: false });
if (error) throw error;

for (const note of data) {
  const folderName = cleanFileName(note.slug || note.id);
  const folder = path.join(outputRoot, folderName);
  await mkdir(folder, { recursive: true });
  await writeFile(path.join(folder, "note.md"), note.body, "utf8");
  const attachments = [];
  for (const attachment of note.note_attachments || []) {
    const safeFileName = cleanFileName(attachment.file_name);
    const { data: fileData, error: downloadError } = await client.storage.from("note-images").download(attachment.storage_path);
    if (downloadError) throw downloadError;
    await writeFile(path.join(folder, safeFileName), Buffer.from(await fileData.arrayBuffer()));
    attachments.push({
      file: safeFileName,
      mediaType: attachment.media_type,
      sourcePageUrl: attachment.source_page_url,
      sourceAssetUrl: attachment.source_asset_url,
      provider: attachment.provider,
      acquiredAt: attachment.acquired_at,
      rightsStatus: attachment.rights_status,
      licenseTerms: attachment.license_terms,
      isAiGenerated: attachment.is_ai_generated,
      altText: attachment.alt_text,
    });
  }
  const metadata = {
    id: note.id,
    slug: note.slug,
    title: note.title,
    summary: note.summary,
    modalities: note.modalities,
    bodyRegions: note.body_regions,
    themes: note.themes,
    tags: note.tags,
    publicationStatus: note.publication_status,
    verificationStatus: note.verification_status,
    checkedAt: note.checked_at,
    favorite: note.favorite,
    version: note.version,
    updatedAt: note.updated_at,
    sources: (note.note_sources || []).map((source) => ({
      title: source.title,
      publisher: source.publisher,
      url: source.url,
      sourceType: source.source_type,
      publishedAt: source.published_at,
      accessedAt: source.accessed_at,
      usedFor: source.used_for,
      reliability: source.reliability,
    })),
    attachments,
  };
  await writeFile(path.join(folder, "meta.json"), `${JSON.stringify(metadata, null, 2)}\n`, "utf8");
}

console.log(`バックアップ完了: ${data.length}件 → ${outputRoot}`);
