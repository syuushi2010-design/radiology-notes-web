import { useEffect, useMemo, useState, type ReactNode } from "react";
import type { Session } from "@supabase/supabase-js";
import { BookOpen, LockKeyhole } from "lucide-react";
import { DemoNoteRepository } from "../data/demoRepository";
import type { NoteRepository } from "../data/repository";
import { SupabaseNoteRepository } from "../data/supabaseRepository";
import { clearOfflineNotes } from "../lib/offlineStore";
import { getOAuthRedirectUrl, isSupabaseConfigured, supabase } from "../lib/supabase";

export interface AuthenticatedApp {
  repository: NoteRepository;
  email?: string;
  demoMode: boolean;
  signOut: () => Promise<void>;
}

interface AuthGateProps {
  children: (value: AuthenticatedApp) => ReactNode;
}

export function AuthGate({ children }: AuthGateProps) {
  const demoRepository = useMemo(() => new DemoNoteRepository(), []);
  const realRepository = useMemo(() => supabase ? new SupabaseNoteRepository(supabase) : null, []);
  const [session, setSession] = useState<Session | null>(null);
  const [loading, setLoading] = useState(isSupabaseConfigured);
  const [authError, setAuthError] = useState<string>();
  const [authorized, setAuthorized] = useState<boolean | null>(null);

  useEffect(() => {
    if (!supabase) return;
    let active = true;
    void supabase.auth.getSession().then(({ data, error }) => {
      if (!active) return;
      if (error) setAuthError("ログイン状態を確認できませんでした。");
      setSession(data.session);
      setLoading(false);
    });
    const { data } = supabase.auth.onAuthStateChange((_event, nextSession) => {
      setSession(nextSession);
      setAuthorized(null);
      setLoading(false);
    });
    return () => {
      active = false;
      data.subscription.unsubscribe();
    };
  }, []);

  useEffect(() => {
    if (!supabase || !session) return;
    let active = true;
    setLoading(true);
    void supabase.rpc("is_allowed_user").then(({ data, error }) => {
      if (!active) return;
      if (error) setAuthError("利用許可を確認できませんでした。");
      if (!data) void clearOfflineNotes().catch(() => undefined);
      setAuthorized(Boolean(data));
      setLoading(false);
    });
    return () => { active = false; };
  }, [session]);

  if (!isSupabaseConfigured && import.meta.env.DEV) {
    return children({
      repository: demoRepository,
      email: "local-preview@example.com",
      demoMode: true,
      signOut: async () => { await clearOfflineNotes().catch(() => undefined); },
    });
  }

  if (!isSupabaseConfigured || !realRepository) {
    return <SafeSetupScreen />;
  }

  if (loading) return <FullPageMessage title="ログイン状態を確認しています" />;

  if (authError) return <FullPageMessage title={authError} />;

  if (!session) {
    return <LoginScreen onLogin={async () => {
      setAuthError(undefined);
      await clearOfflineNotes().catch(() => undefined);
      const { error } = await supabase!.auth.signInWithOAuth({
        provider: "google",
        options: { redirectTo: getOAuthRedirectUrl() },
      });
      if (error) setAuthError("Googleログインを開始できませんでした。");
    }} />;
  }

  const email = session.user.email?.toLowerCase();
  if (authorized === null) return <FullPageMessage title="利用許可を確認しています" />;
  if (!authorized) {
    return <UnauthorizedScreen email={email} onSignOut={async () => {
      await clearOfflineNotes().catch(() => undefined);
      await supabase!.auth.signOut();
    }} />;
  }

  return children({
    repository: realRepository,
    email,
    demoMode: false,
    signOut: async () => {
      await clearOfflineNotes().catch(() => undefined);
      await supabase!.auth.signOut();
    },
  });
}

function LoginScreen({ onLogin }: { onLogin: () => Promise<void> }) {
  const [pending, setPending] = useState(false);
  return (
    <main className="auth-page">
      <section className="auth-card">
        <span className="auth-mark"><BookOpen aria-hidden="true" size={28} /></span>
        <p className="eyebrow">PRIVATE KNOWLEDGE BASE</p>
        <h1>放射線技師<br />ナレッジノート</h1>
        <p>本人専用のノートを開くには、許可されたGoogleアカウントでログインしてください。</p>
        <button className="primary-button auth-button" disabled={pending} type="button" onClick={() => {
          setPending(true);
          void onLogin().finally(() => setPending(false));
        }}>
          <span className="google-g" aria-hidden="true">G</span>
          {pending ? "Googleへ移動しています…" : "Googleでログイン"}
        </button>
        <div className="auth-security"><LockKeyhole size={15} aria-hidden="true" />ノート本文と画像はログイン後だけ取得します</div>
      </section>
    </main>
  );
}

function UnauthorizedScreen({ email, onSignOut }: { email?: string; onSignOut: () => Promise<void> }) {
  return (
    <main className="auth-page">
      <section className="auth-card auth-card--compact">
        <span className="auth-mark"><LockKeyhole aria-hidden="true" size={26} /></span>
        <h1>アクセスできません</h1>
        <p>{email ?? "このアカウント"} は利用許可リストに登録されていません。</p>
        <button className="secondary-button" type="button" onClick={() => void onSignOut()}>別のアカウントでログイン</button>
      </section>
    </main>
  );
}

function SafeSetupScreen() {
  return (
    <main className="auth-page">
      <section className="auth-card auth-card--compact">
        <span className="auth-mark"><LockKeyhole aria-hidden="true" size={26} /></span>
        <h1>初期設定が必要です</h1>
        <p>安全のため、保存先と本人ログインの設定が完了するまでノートは表示しません。</p>
      </section>
    </main>
  );
}

function FullPageMessage({ title }: { title: string }) {
  return <main className="auth-page"><p className="loading-message">{title}</p></main>;
}
