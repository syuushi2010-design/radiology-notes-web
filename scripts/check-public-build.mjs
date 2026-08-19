import { readdir, readFile } from "node:fs/promises";
import path from "node:path";
import process from "node:process";

const buildDirectory = path.resolve("dist");
const textExtensions = new Set([".css", ".html", ".js", ".json", ".map", ".txt", ".webmanifest", ".xml"]);
const forbiddenNames = [".env", ".env.local", "meta.json", "note.md"];
const forbiddenContent = [
  "SUPABASE_SERVICE_ROLE_KEY",
  "SUPABASE_SECRET_KEY",
  "SUPABASE_OWNER_USER_ID",
  /sb_secret_[A-Za-z0-9_-]{20,}/,
  "BEGIN PRIVATE KEY",
  "/Volumes/codexdev",
  "content/notes/",
  "content/inbox/",
];

const files = await walk(buildDirectory).catch(() => {
  console.error("dist が見つかりません。先に npm run build を実行してください。");
  process.exit(1);
});
const problems = [];

for (const file of files) {
  const relative = path.relative(buildDirectory, file);
  if (forbiddenNames.some((name) => relative === name || relative.endsWith(`/${name}`))) {
    problems.push(`${relative}: 公開対象外のファイル名`);
  }
  if (!textExtensions.has(path.extname(file))) continue;
  const value = await readFile(file, "utf8");
  for (const marker of forbiddenContent) {
    const matched = typeof marker === "string" ? value.includes(marker) : marker.test(value);
    if (matched) problems.push(`${relative}: 禁止文字列 ${String(marker)}`);
  }
}

if (problems.length > 0) {
  console.error(`公開ビルドの安全確認に失敗しました:\n- ${problems.join("\n- ")}`);
  process.exit(1);
}

console.log(`公開ビルドの安全確認に合格しました（${files.length}ファイル）。`);

async function walk(directory) {
  const entries = await readdir(directory, { withFileTypes: true });
  const nested = await Promise.all(entries.map((entry) => {
    const target = path.join(directory, entry.name);
    return entry.isDirectory() ? walk(target) : [target];
  }));
  return nested.flat();
}
