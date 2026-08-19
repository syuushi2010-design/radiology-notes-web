import { useEffect, useRef, useState } from "react";
import { Route, Routes } from "react-router-dom";
import type { AuthenticatedApp } from "./app/AuthGate";
import { KnowledgeBaseProvider, useKnowledgeBase } from "./app/KnowledgeBaseContext";
import { Layout } from "./components/Layout";
import { ArchivePage, FavoritesPage, ReviewPage } from "./pages/CollectionPage";
import { HomePage } from "./pages/HomePage";
import { NoteDetailPage } from "./pages/NoteDetailPage";
import { NoteEditorPage } from "./pages/NoteEditorPage";
import { SettingsPage } from "./pages/SettingsPage";
import "./styles.css";

export default function App({ repository, email, demoMode, signOut }: AuthenticatedApp) {
  return (
    <KnowledgeBaseProvider repository={repository}>
      <ApplicationRoutes email={email} demoMode={demoMode} signOut={signOut} />
    </KnowledgeBaseProvider>
  );
}

function ApplicationRoutes({ email, demoMode, signOut }: Pick<AuthenticatedApp, "email" | "demoMode" | "signOut">) {
  const { offline } = useKnowledgeBase();
  return (
    <>
      <PwaUpdateNotice />
      <Routes>
        <Route element={<Layout email={email} demoMode={demoMode} offline={offline} onSignOut={signOut} />}>
          <Route index element={<HomePage />} />
          <Route path="favorites" element={<FavoritesPage />} />
          <Route path="review" element={<ReviewPage />} />
          <Route path="archive" element={<ArchivePage />} />
          <Route path="settings" element={<SettingsPage demoMode={demoMode} />} />
          <Route path="notes/:id" element={<NoteDetailPage />} />
          <Route path="notes/:id/edit" element={<NoteEditorPage />} />
          <Route path="new" element={<NoteEditorPage />} />
          <Route path="*" element={<NotFoundPage />} />
        </Route>
      </Routes>
    </>
  );
}

function PwaUpdateNotice() {
  const registrationRef = useRef<ServiceWorkerRegistration | null>(null);
  const [updateAvailable, setUpdateAvailable] = useState(false);
  const [checking, setChecking] = useState(false);

  useEffect(() => {
    if (!("serviceWorker" in navigator)) return;
    let active = true;
    const showWhenWaiting = (registration: ServiceWorkerRegistration) => {
      if (registration.waiting && navigator.serviceWorker.controller) setUpdateAvailable(true);
    };
    const handleControllerChange = () => window.location.reload();
    navigator.serviceWorker.addEventListener("controllerchange", handleControllerChange);
    void navigator.serviceWorker.getRegistration().then((registration) => {
      if (!active || !registration) return;
      registrationRef.current = registration;
      showWhenWaiting(registration);
      registration.addEventListener("updatefound", () => {
        const installing = registration.installing;
        if (!installing) return;
        installing.addEventListener("statechange", () => {
          if (installing.state === "installed") showWhenWaiting(registration);
        });
      });
      void registration.update().catch(() => undefined);
    });
    return () => {
      active = false;
      navigator.serviceWorker.removeEventListener("controllerchange", handleControllerChange);
    };
  }, []);

  if (!updateAvailable) return null;
  return <aside className="pwa-update-notice" role="status" aria-live="polite">
    <div><strong>最新版があります</strong><span>更新すると最新の画面に切り替わります。</span></div>
    <button className="primary-button" type="button" disabled={checking} onClick={() => {
      const registration = registrationRef.current;
      if (!registration?.waiting) return;
      setChecking(true);
      registration.waiting.postMessage({ type: "SKIP_WAITING" });
    }}>{checking ? "更新中…" : "最新版に更新"}</button>
  </aside>;
}

function NotFoundPage() {
  return <main className="main-content page-content"><p className="empty-state">ページが見つかりません。</p></main>;
}
