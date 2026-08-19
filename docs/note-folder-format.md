# Codex同期用ノート形式

`content/notes/<任意のフォルダ名>/` に `note.md` と `meta.json` を置きます。画像を保存する場合は同じフォルダへ置き、`meta.json` の `attachments` から参照します。

```text
content/notes/mri-brain-axial/
├── note.md
├── meta.json
└── planning-image.webp
```

`meta.json` の例:

```json
{
  "id": "省略時は新規UUIDを生成",
  "version": 3,
  "slug": "mri-brain-axial",
  "title": "頭部MRI：Axial断面の設定基準",
  "summary": "断面設定の基準と注意点。",
  "modalities": ["MRI"],
  "bodyRegions": ["頭部・脳"],
  "themes": ["撮影断面・スライス設定"],
  "tags": ["Axial", "AC-PC line"],
  "verificationStatus": "codex_verified",
  "publicationStatus": "published",
  "checkedAt": "2026-08-19",
  "sources": [
    {
      "title": "資料名",
      "publisher": "発行元",
      "url": "https://example.com",
      "sourceType": "official",
      "accessedAt": "2026-08-19",
      "usedFor": "撮影断面の基準",
      "reliability": "official"
    }
  ],
  "attachments": [
    {
      "file": "planning-image.webp",
      "sourcePageUrl": "https://example.com/source",
      "sourceAssetUrl": "https://example.com/image.webp",
      "provider": "提供元名",
      "acquiredAt": "2026-08-19",
      "rightsStatus": "reusable",
      "licenseTerms": "CC BY 4.0",
      "isAiGenerated": false,
      "altText": "正中矢状断像上の基準線"
    }
  ]
}
```

`id` を持つ既存ノートでは `version` が必須です。Supabaseの最新版と一致しない場合、同期スクリプトは競合として停止します。新規ノートでは `id` と `version` を省略できます。

`codex_verified` には1件以上の出典が必要です。根拠や画像の権利に問題が残る場合は `verificationStatus: "needs_review"` と `publicationStatus: "draft"` にします。

外部画像には元ページURLと提供元が必要です。`link_only` は画像ファイルを同期せず、本文または出典にリンクだけを記録します。画像はJPEG、PNG、WebPの10MB以下にします。

同期は次の形で実行します。

```sh
npm run sync:note -- content/notes/mri-brain-axial
```

実データ、画像、バックアップ、`.env.local` は公開リポジトリへ含めません。
