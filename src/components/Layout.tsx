import { Archive, BookOpen, CircleAlert, CloudOff, Heart, Home, LogOut, Plus, Settings } from "lucide-react";
import { Link, NavLink, Outlet } from "react-router-dom";

export function Layout({ email, demoMode, offline, onSignOut }: { email?: string; demoMode: boolean; offline: boolean; onSignOut: () => Promise<void> }) {
  return (
    <div className="app-shell">
      <header className="topbar">
        <Link className="brand" to="/" aria-label="放射線技師ナレッジノート ホーム">
          <span className="brand-mark" aria-hidden="true"><BookOpen size={21} /></span>
          <span>放射線技師ナレッジノート</span>
        </Link>
        <nav className="desktop-nav" aria-label="メインナビゲーション">
          <NavLink to="/" end><Home size={17} />ホーム</NavLink>
          <NavLink to="/favorites"><Heart size={17} />保存済み</NavLink>
          <NavLink to="/review"><CircleAlert size={17} />要確認</NavLink>
        </nav>
        <div className="account-area">
          {offline && <span className="offline-badge"><CloudOff size={14} />オフライン</span>}
          {demoMode && <span className="demo-badge">プレビュー</span>}
          <details className="account-menu">
            <summary aria-label="アカウントメニュー">{email?.slice(0, 1).toUpperCase() ?? "RT"}</summary>
            <div>
              <p>{email}</p>
              <Link to="/settings"><Settings size={15} />設定・データ管理</Link>
              <Link to="/archive"><Archive size={15} />アーカイブ</Link>
              <button type="button" onClick={() => void onSignOut()}><LogOut size={15} />ログアウト</button>
            </div>
          </details>
        </div>
      </header>

      <Outlet />

      <Link className="floating-action" to="/new">
        <Plus aria-hidden="true" size={22} />
        <span>新規ノート</span>
      </Link>

      <nav className="mobile-nav" aria-label="モバイルナビゲーション">
        <NavLink to="/" end><Home size={20} /><span>ホーム</span></NavLink>
        <NavLink to="/favorites"><Heart size={20} /><span>保存済み</span></NavLink>
        <NavLink to="/review"><CircleAlert size={20} /><span>要確認</span></NavLink>
      </nav>
    </div>
  );
}
