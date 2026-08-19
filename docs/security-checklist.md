# セキュリティチェックリスト

## 公開前

- [ ] リポジトリ内に患者情報、個人情報、社外秘、院内限定資料、DICOMがない
- [ ] `content/inbox/` と `content/notes/` にある実データがGit対象外
- [ ] `backups/` の実データがGit対象外
- [ ] `.env.local` がGit対象外
- [ ] `SUPABASE_SECRET_KEY`、`SUPABASE_SERVICE_ROLE_KEY`、`sb_secret_` がソースにない
- [ ] GitHub ActionsにはURLとPublishable keyだけを登録した
- [ ] Supabaseの全公開テーブルでRLSが有効
- [ ] `anon` にはノートテーブル権限を与えていない
- [ ] 許可メールが本人のGoogleアカウント1件だけ
- [ ] Storageの `note-images` バケットがprivate
- [ ] Google OAuthのRedirect URLが本番・ローカルの必要最小限
- [ ] `npm run verify` が成功
- [ ] `git status --short` でコミット対象を目視確認

## 公開後のアクセス確認

- [ ] シークレットウィンドウではログイン画面以外のデータが見えない
- [ ] 許可外Googleアカウントが拒否される
- [ ] ブラウザのNetwork画面で、未ログイン時にnotesや画像を取得していない
- [ ] 画像URLはSupabase Storageの期限付きURL
- [ ] ログアウト後、オフラインで以前のノートが開けない
- [ ] GitHub Pagesの成果物に `.env`、`note.md`、`meta.json` がない

## 運用中

- [ ] 患者情報・業務秘密を入力しない
- [ ] 医学的内容には出典と適用条件を付ける
- [ ] Codexへ依頼していない調査やファクトチェックを自動化しない
- [ ] `Codex確認済み` は根拠確認が完了した時だけ使う
- [ ] 外部画像の元ページ、提供元、権利状態を残す
- [ ] 保存禁止やアクセス制限を回避して画像を取得しない
- [ ] 大きな変更後と月1回に完全バックアップを取る
- [ ] Supabase Security Advisorを確認する
- [ ] GitHubのDependabot/セキュリティ警告を確認する
- [ ] 不要になったSecret keyを削除またはローテーションする

## 鍵が漏れた疑いがある場合

1. Supabase Dashboardで該当Secret keyを直ちに削除・無効化する。
2. 新しいSecret keyを作り、ローカル `.env.local` だけを更新する。
3. Git履歴、GitHub Actionsログ、公開成果物に漏えい値がないか確認する。
4. Supabase Logsで不審な操作を確認する。
5. データ改変の疑いがあれば、ローカルバックアップと変更履歴を比較する。

Publishable keyは公開前提ですが、RLSが無効または過剰な場合はデータへ到達できます。鍵の秘匿ではなく、RLSと最小権限を主な防御にします。

- [Supabase公式: APIキー](https://supabase.com/docs/guides/getting-started/api-keys)
- [Supabase公式: データ保護](https://supabase.com/docs/guides/database/secure-data)
- [Supabase公式: 本番チェックリスト](https://supabase.com/docs/guides/deployment/going-into-prod)
