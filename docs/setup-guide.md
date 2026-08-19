# 初回セットアップガイド

この手順では、GitHub Pagesに画面だけを無料公開し、ノートと画像を本人専用のSupabaseへ保存します。2026-08-19時点の管理画面・公式文書を基準にしています。

## 0. 用意するもの

- GitHubアカウント
- Googleアカウント
- Supabaseアカウント
- ローカル開発用のNode.js 24
- 公開リポジトリ名。例: `radiology-notes-web`

GitHub PagesをGitHub Freeで使う場合は公開リポジトリにします。リポジトリのコードは誰でも見られるため、ノート、画像、秘密鍵は絶対に入れません。GitHubもPagesサイトがインターネットへ公開されることを明記しています。

- [GitHub Pagesの公開元設定](https://docs.github.com/en/pages/getting-started-with-github-pages/configuring-a-publishing-source-for-your-github-pages-site)

## 1. ローカル確認

```sh
cd /Volumes/codexdev/radiology-notes-web
npm install
npm run verify
npm run dev
```

Supabase未設定の開発環境ではプレビューモードになります。本番ビルドはSupabase設定がない場合、安全な「初期設定が必要です」画面だけを表示します。

## 2. Supabase Freeプロジェクトを作る

1. Supabase Dashboardで新しいプロジェクトを作る。
2. Project URLを控える。
3. `Settings > API Keys` でPublishable keyを作成または取得する。
4. ローカル同期・バックアップを使う場合だけSecret keyも取得する。

Publishable keyはブラウザへ含めてよい低権限キーです。実データの保護はログイン情報とRow Level Securityで行います。Secret keyまたは旧service_role keyはRLSを回避できるため、ブラウザ、GitHub、チャットへ貼りません。

- [Supabase公式: APIキーの種類](https://supabase.com/docs/guides/getting-started/api-keys)
- [Supabase公式: Row Level Security](https://supabase.com/docs/guides/database/postgres/row-level-security)

## 3. データベースと非公開画像バケットを作る

1. Supabase DashboardのSQL Editorを開く。
2. `supabase/migrations/0001_initial_schema.sql` の全内容を貼り付ける。
3. 一度だけ実行する。
4. エラーがないことを確認する。

このSQLは次を作成します。

- ノート、出典、画像メタデータ、関連ノート、変更履歴
- 全テーブルのRLS
- 本人メール許可リスト
- 本人確認用RPC
- 10MB制限の非公開 `note-images` バケット
- ユーザーIDごとのStorageポリシー

## 4. 本人メールを許可する

`supabase/allow-user.sql.example` を参考に、SQL Editorで次を実行します。

```sql
insert into public.app_allowed_users (email)
values (lower('自分のGoogleメールアドレス'))
on conflict (email) do nothing;
```

この表はブラウザから直接読み取れません。ログイン後にサーバー側関数がメール一致だけを判定します。

## 5. Googleログインを設定する

### 5.1 Google Auth Platform

1. Google Cloudでプロジェクトを作る。
2. Google Auth PlatformでBranding、Audience、Data Accessを設定する。
3. Scopesは基本の `openid`、メール、プロフィールだけにする。
4. Clientsで種類「Web application」のOAuth clientを作る。
5. Authorized JavaScript originsへ次を登録する。

```text
https://<GitHubユーザー名>.github.io
http://localhost:5173
```

6. Authorized redirect URIsには、SupabaseのGoogle Provider画面に表示されるCallback URLをそのまま登録する。通常は次の形式です。

```text
https://<SupabaseプロジェクトID>.supabase.co/auth/v1/callback
```

7. Client IDとClient Secretを控える。

### 5.2 Supabase Auth

1. `Authentication > Providers > Google` を開く。
2. Google providerを有効にする。
3. Client IDとClient Secretを保存する。
4. `Authentication > URL Configuration` を開く。
5. Site URLをGitHub Pagesの完成URLにする。
6. Redirect URLsへ本番URLとローカルURLを登録する。

```text
https://<GitHubユーザー名>.github.io/<リポジトリ名>/
http://localhost:5173/
```

本アプリが指定する `redirectTo` は、この許可リストと一致する必要があります。

- [Supabase公式: Googleログイン](https://supabase.com/docs/guides/auth/social-login/auth-google)
- [Supabase公式: Redirect URLs](https://supabase.com/docs/guides/auth/redirect-urls)

## 6. ローカルから実環境へ接続する

`.env.example` をコピーして `.env.local` を作り、実値を入れます。

```dotenv
VITE_SUPABASE_URL=https://<プロジェクトID>.supabase.co
VITE_SUPABASE_PUBLISHABLE_KEY=sb_publishable_...
SUPABASE_SECRET_KEY=sb_secret_...
SUPABASE_OWNER_USER_ID=<本人のSupabase user UUID>
```

最初のログイン前は `SUPABASE_OWNER_USER_ID` を空欄にしてもWebアプリは動きます。Googleで一度ログインした後、Supabase Dashboardの `Authentication > Users` から本人のUser IDをコピーし、ローカル同期用に設定します。

Secret keyとOwner User IDはローカルスクリプト専用です。GitHub Actionsへ登録しません。

```sh
npm run dev
```

Googleログイン後、自分のアカウントだけがノート画面へ入れることを確認します。

## 7. GitHub公開リポジトリを作る

1. GitHubで空の公開リポジトリを作る。
2. README、`.gitignore`、LicenseをGitHub側で自動追加しない。
3. このフォルダをGit初期化し、`main` ブランチをpushする。

公開前に必ず次を実行します。

```sh
npm run verify
git status --short
```

`content/`、`backups/`、`.env.local`、実際のノート画像がコミット対象に出ていないことを確認します。

## 8. GitHub Actionsの公開変数を設定する

リポジトリの `Settings > Secrets and variables > Actions > Variables` に次の2件を登録します。

```text
VITE_SUPABASE_URL
VITE_SUPABASE_PUBLISHABLE_KEY
```

GitHubのVariablesはログでマスクされない非機密設定向けです。この2値はブラウザへ配布される前提なのでVariablesで問題ありません。Secret keyは絶対に登録しません。

- [GitHub公式: Actions Variables](https://docs.github.com/en/actions/concepts/workflows-and-actions/variables)

## 9. GitHub Pagesを有効にする

1. リポジトリの `Settings > Pages` を開く。
2. `Build and deployment > Source` で `GitHub Actions` を選ぶ。
3. `main` へpushするか、Actions画面から `GitHub Pagesへ公開` を手動実行する。
4. テスト、ビルド、公開物検査、deployがすべて緑になることを確認する。

`.github/workflows/deploy-pages.yml` は、リポジトリ名に合わせたサブディレクトリURLを自動設定します。

- [GitHub公式: Pagesのカスタムワークフロー](https://docs.github.com/en/pages/getting-started-with-github-pages/using-custom-workflows-with-github-pages)

## 10. 公開後の受け入れ確認

- 未ログインではノート件数・タイトル・画像が見えない。
- 許可外Googleアカウントは拒否される。
- 許可済み本人アカウントでは作成・編集できる。
- iPhone/iPadのSafariで表示が崩れない。
- 画像URLはSupabaseの期限付きURLで、バケット自体はprivateになっている。
- お気に入りまたは一度開いたノートを、機内モードで再表示できる。
- ログアウト後はオフライン保存ノートを表示できない。
- 設定画面からMarkdownを書き出せる。

## 11. 月額費用

初期構成の目標は月額0円です。

- GitHub Pages: GitHub Freeの公開リポジトリで0円
- Supabase Free: 0ドル/月
- Google OAuth: この個人用途の基本ログイン構成では追加料金なし
- OpenAI API: アプリからは利用しないため0円
- 独自ドメイン: 使用しないため0円

2026-08-19時点のSupabase Freeには、データベース500MB、ファイル1GB、egress 5GB、月間アクティブユーザー50,000などが含まれます。個人ノートには十分な想定ですが、1週間利用がないFreeプロジェクトは一時停止対象で、自動バックアップも含まれません。そのためローカルバックアップを定期的に実行します。Proは25ドル/月からです。

- [Supabase公式料金](https://supabase.com/pricing)

料金・無料枠は変わる可能性があるため、有料移行前に必ず公式ページを再確認します。
