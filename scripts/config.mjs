import { createClient } from "@supabase/supabase-js";

export function getAdminClient() {
  const url = process.env.VITE_SUPABASE_URL?.trim();
  const secretKey = process.env.SUPABASE_SECRET_KEY?.trim() || process.env.SUPABASE_SERVICE_ROLE_KEY?.trim();
  const ownerUserId = process.env.SUPABASE_OWNER_USER_ID?.trim();
  if (!url || !secretKey || !ownerUserId) {
    throw new Error(".env.local に VITE_SUPABASE_URL、SUPABASE_SECRET_KEY、SUPABASE_OWNER_USER_ID が必要です。");
  }
  return {
    ownerUserId,
    client: createClient(url, secretKey, { auth: { persistSession: false, autoRefreshToken: false } }),
  };
}

export function cleanFileName(value) {
  return value.normalize("NFKC").replace(/[^\p{L}\p{N}._-]/gu, "-");
}

export function mediaTypeFor(fileName) {
  const extension = fileName.toLowerCase().split(".").pop();
  if (extension === "png") return "image/png";
  if (extension === "webp") return "image/webp";
  if (extension === "jpg" || extension === "jpeg") return "image/jpeg";
  throw new Error(`未対応の画像形式です: ${fileName}`);
}
