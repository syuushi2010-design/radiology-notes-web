-- ローカル同期・バックアップ専用のSecret keyは service_role として接続する。
-- RLSを迂回できるだけではテーブル権限は付与されないため、
-- ノート同期に必要な公開スキーマのテーブルだけを明示的に許可する。

grant select, insert, update, delete
on public.notes,
   public.note_sources,
   public.note_attachments,
   public.note_relations
to service_role;

-- 変更履歴はトリガーが作成し、ローカル側はバックアップ時の参照だけを行う。
grant select on public.note_versions to service_role;
