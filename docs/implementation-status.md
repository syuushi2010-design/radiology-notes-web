# 実装状況

- 更新日: 2026-08-19
- ローカル実装: 完了
- 外部サービス接続: 未実施
- 本番公開: 未実施

## ローカルで完了しているもの

- React・TypeScript・ViteのPWA
- iPhone・iPad・PC対応の明るいレスポンシブUI
- 検索、複合分類、並び替え
- ノート作成・編集・状態管理・Markdownプレビュー
- 出典・画像権利メタデータ
- お気に入り、最近閲覧、オフライン閲覧
- アーカイブ、Markdown書き出し
- 楽観的ロック、変更履歴、過去版復元
- Supabaseスキーマ、RLS、本人許可リスト、非公開Storage
- Codex同期、競合停止、完全バックアップ
- GitHub Pages自動公開ワークフロー
- 型検査、ユニットテスト、公開物の秘密情報検査

## 実アカウントが必要な残作業

1. Supabase Freeプロジェクト作成
2. 初期SQL適用
3. 本人メール許可
4. Google OAuth client作成とSupabase Provider設定
5. GitHubの公開リポジトリ作成
6. GitHub Actions Variables設定
7. GitHub Pages公開
8. iPhone・iPadで受け入れ確認

作業手順は [初回セットアップガイド](setup-guide.md) にまとめています。外部アカウントや公開先を推測して作成しないため、現時点ではローカルで止めています。
