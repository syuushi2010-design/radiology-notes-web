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
  );
}

function NotFoundPage() {
  return <main className="main-content page-content"><p className="empty-state">ページが見つかりません。</p></main>;
}
