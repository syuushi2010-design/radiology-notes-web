import process from "node:process";

const url = process.env.VITE_SUPABASE_URL?.trim() ?? "";
const publishableKey = process.env.VITE_SUPABASE_PUBLISHABLE_KEY?.trim() ?? "";
const errors = [];

if (!url || /your-project|example/i.test(url)) {
  errors.push("VITE_SUPABASE_URL が実際の値に設定されていません。");
} else {
  try {
    const parsed = new URL(url);
    if (parsed.protocol !== "https:") errors.push("VITE_SUPABASE_URL は https:// である必要があります。");
  } catch {
    errors.push("VITE_SUPABASE_URL の形式が正しくありません。");
  }
}

if (!publishableKey || publishableKey.length < 30 || /xxxxxxxx|your-|example/i.test(publishableKey)) {
  errors.push("VITE_SUPABASE_PUBLISHABLE_KEY が実際の値に設定されていません。");
}

if (/^sb_secret_/i.test(publishableKey) || jwtRole(publishableKey) === "service_role") {
  errors.push("ブラウザ用変数に秘密鍵/service_role keyを設定しています。公開可能なPublishable keyを使ってください。");
}

if (errors.length > 0) {
  console.error(`公開設定を確認してください:\n- ${errors.join("\n- ")}`);
  process.exit(1);
}

console.log("公開用Supabase設定を確認しました（値そのものは表示していません）。");

function jwtRole(value) {
  const payload = value.split(".")[1];
  if (!payload) return undefined;
  try {
    return JSON.parse(Buffer.from(payload, "base64url").toString("utf8")).role;
  } catch {
    return undefined;
  }
}
