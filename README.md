# 放射線技師ナレッジノート（仮称）

放射線技師として調べた知識を、iPhone・iPad・PCから検索、閲覧、編集するための本人専用Webアプリです。画面プログラムはGitHub Pages、非公開のノートと画像はSupabaseに保存します。

本番環境は初期データ0件で開始します。ローカル開発時だけ表示されるサンプルはUI確認用であり、臨床上の根拠資料ではありません。

## 実装済みの主な機能

- Googleログインとメール許可リストによる本人限定アクセス
- ノートの作成、編集、下書き、公開、アーカイブ
- 日本語全文検索と、モダリティ・部位・テーマ・タグの複合絞り込み
- Markdown編集、プレビュー、出典の詳細情報
- 非公開画像保存、権利状態・提供元・元URLの記録
- お気に入り、最近閲覧、オフライン参照、ログアウト時の端末データ消去
- 版競合の検出、変更履歴、過去版の復元
- Markdown書き出しと、画像を含むローカル完全バックアップ
- GitHub Pages自動公開前のテスト・秘密情報混入検査

## ローカルで確認する

Node.js 24を推奨します。

```sh
npm install
npm run dev
```

Supabaseを設定していない開発環境では、メモリ上のプレビューデータで起動します。保存内容は再読み込みすると消えます。

```sh
npm run verify
```

`verify` は型検査、テスト、本番ビルド、公開物の秘密情報検査をまとめて実行します。

## 重要な文書

- [要件仕様書](docs/requirements-spec.md)
- [初回セットアップガイド](docs/setup-guide.md)
- [実装状況](docs/implementation-status.md)
- [運用ガイド](docs/operations-guide.md)
- [セキュリティチェックリスト](docs/security-checklist.md)
- [Codex同期用ノート形式](docs/note-folder-format.md)

## データをGitへ入れない

`content/inbox/`、`content/notes/`、`backups/`、`.env.local` の実データは `.gitignore` の対象です。患者情報、社外秘、院内限定資料、認証情報はこのプロジェクトで扱いません。

調査、画像探索、ファクトチェックは自動実行しません。本人がCodexへ明示的に依頼した時だけ行います。
