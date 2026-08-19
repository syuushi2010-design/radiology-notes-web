import { Archive, Cloud, Download, HardDrive, LockKeyhole, Settings } from "lucide-react";
import type { ReactNode } from "react";
import { Link } from "react-router-dom";
import { useKnowledgeBase } from "../app/KnowledgeBaseContext";
import { downloadNotesAsMarkdown } from "../lib/exportMarkdown";

export function SettingsPage({ demoMode }: { demoMode: boolean }) {
  const { notes, offline, lastSyncedAt } = useKnowledgeBase();
  const activeCount = notes.filter((note) => note.publicationStatus !== "archived").length;
  const archivedCount = notes.length - activeCount;

  return (
    <main className="main-content page-content settings-page">
      <header className="page-header">
        <span className="page-header__icon"><Settings size={22} /></span>
        <div><h1>設定・データ管理</h1><p>同期状態、バックアップ、アーカイブを確認できます。</p></div>
      </header>

      <section className="status-grid">
        <StatusCard icon={<Cloud size={20} />} title="接続状態" value={offline ? "オフライン" : demoMode ? "ローカルプレビュー" : "Supabaseに接続中"} detail={lastSyncedAt ? `最終同期 ${formatDateTime(lastSyncedAt)}` : "まだ同期していません"} />
        <StatusCard icon={<HardDrive size={20} />} title="ノート" value={`${activeCount}件`} detail={`アーカイブ ${archivedCount}件`} />
        <StatusCard icon={<LockKeyhole size={20} />} title="保存先" value={demoMode ? "一時メモリ" : "本人専用ストレージ"} detail={demoMode ? "再読み込みでデモ変更は消えます" : "RLSと非公開バケットで保護"} />
      </section>

      <section className="settings-card">
        <div><h2>Markdownバックアップ</h2><p>現在読み込まれている全ノートを、1つのMarkdownファイルとして端末へ保存します。画像本体を含む完全バックアップは、ローカルプロジェクトの書き出しコマンドを使います。</p></div>
        <button className="primary-button" type="button" disabled={notes.length === 0} onClick={() => downloadNotesAsMarkdown(notes)}><Download size={16} />書き出す</button>
      </section>

      <section className="settings-card">
        <div><h2>アーカイブ</h2><p>保管中のノートを確認し、必要なら編集画面から下書きまたは公開へ戻せます。</p></div>
        <Link className="secondary-button" to="/archive"><Archive size={16} />{archivedCount}件を開く</Link>
      </section>
    </main>
  );
}

function StatusCard({ icon, title, value, detail }: { icon: ReactNode; title: string; value: string; detail: string }) {
  return <article className="status-card"><span>{icon}</span><div><p>{title}</p><strong>{value}</strong><small>{detail}</small></div></article>;
}

function formatDateTime(value: string) {
  return new Intl.DateTimeFormat("ja-JP", { year: "numeric", month: "numeric", day: "numeric", hour: "2-digit", minute: "2-digit" }).format(new Date(value));
}
