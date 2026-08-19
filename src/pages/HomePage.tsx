import Fuse from "fuse.js";
import { CircleAlert, Heart, Search, SlidersHorizontal, X } from "lucide-react";
import { useEffect, useMemo, useRef, useState } from "react";
import { NoteCard } from "../components/NoteCard";
import { useKnowledgeBase } from "../app/KnowledgeBaseContext";
import { bodyRegions, modalities, themes } from "../types";

type Scope = "all" | "favorites" | "review";
type SortOrder = "relevance" | "updated" | "title";

export function HomePage() {
  const { notes, loading, error, toggleFavorite } = useKnowledgeBase();
  const [query, setQuery] = useState("");
  const [selectedModalities, setSelectedModalities] = useState<string[]>([]);
  const [selectedRegions, setSelectedRegions] = useState<string[]>([]);
  const [selectedThemes, setSelectedThemes] = useState<string[]>([]);
  const [selectedTags, setSelectedTags] = useState<string[]>([]);
  const [scope, setScope] = useState<Scope>("all");
  const [sortOrder, setSortOrder] = useState<SortOrder>("relevance");
  const [filtersOpen, setFiltersOpen] = useState(false);
  const searchRef = useRef<HTMLInputElement>(null);

  useEffect(() => {
    const handleShortcut = (event: KeyboardEvent) => {
      if ((event.metaKey || event.ctrlKey) && event.key.toLowerCase() === "k") {
        event.preventDefault();
        searchRef.current?.focus();
      }
    };
    window.addEventListener("keydown", handleShortcut);
    return () => window.removeEventListener("keydown", handleShortcut);
  }, []);

  const activeNotes = useMemo(() => notes.filter((note) => note.publicationStatus !== "archived"), [notes]);
  const availableTags = useMemo(() => Array.from(new Set(activeNotes.flatMap((note) => note.tags))).sort((a, b) => a.localeCompare(b, "ja")), [activeNotes]);
  const fuse = useMemo(() => new Fuse(activeNotes, {
    keys: ["title", "summary", "body", "tags", "modalities", "bodyRegions", "themes", "sources.title", "sources.publisher"],
    threshold: 0.32,
    ignoreLocation: true,
    minMatchCharLength: 1,
  }), [activeNotes]);

  const visibleNotes = useMemo(() => {
    const searched = query.trim() ? fuse.search(query.trim()).map((result) => result.item) : activeNotes;
    const filtered = searched.filter((note) =>
      (selectedModalities.length === 0 || selectedModalities.some((value) => note.modalities.includes(value))) &&
      (selectedRegions.length === 0 || selectedRegions.some((value) => note.bodyRegions.includes(value))) &&
      (selectedThemes.length === 0 || selectedThemes.some((value) => note.themes.includes(value))) &&
      (selectedTags.length === 0 || selectedTags.every((value) => note.tags.includes(value))) &&
      (scope === "all" || (scope === "favorites" ? note.favorite : note.verificationStatus === "needs_review"))
    );
    if (sortOrder === "title") return [...filtered].sort((a, b) => a.title.localeCompare(b.title, "ja"));
    if (sortOrder === "updated" || !query.trim()) return [...filtered].sort((a, b) => b.updatedAt.localeCompare(a.updatedAt));
    return filtered;
  }, [activeNotes, fuse, query, scope, selectedModalities, selectedRegions, selectedTags, selectedThemes, sortOrder]);

  const activeFilterCount = selectedModalities.length + selectedRegions.length + selectedThemes.length + selectedTags.length + (scope === "all" ? 0 : 1);
  const clearFilters = () => {
    setSelectedModalities([]);
    setSelectedRegions([]);
    setSelectedThemes([]);
    setSelectedTags([]);
    setScope("all");
  };

  return (
    <main className="main-content">
      <section className="hero" aria-labelledby="home-title">
        <p className="eyebrow">RADIOLOGY KNOWLEDGE BASE</p>
        <h1 id="home-title">知りたい撮影基準を、<br />すぐ手元に。</h1>
        <p className="hero-copy">MRIのスライス設定からCTの撮影範囲まで、調べた知識を整理して持ち歩けます。</p>
        <label className="search-box">
          <Search aria-hidden="true" size={22} />
          <span className="sr-only">ノートを検索</span>
          <input ref={searchRef} aria-label="ノートを検索" type="search" value={query} onChange={(event) => setQuery(event.target.value)} placeholder="部位・モダリティ・キーワードで検索" />
          <kbd>⌘ K</kbd>
        </label>
      </section>

      <section className="quick-filters" aria-label="クイック分類">
        <button type="button" className={`filter-chip ${activeFilterCount === 0 ? "filter-chip--active" : ""}`} onClick={clearFilters}>すべて</button>
        {modalities.slice(0, 4).map((modality) => (
          <button type="button" key={modality} className={`filter-chip ${selectedModalities.includes(modality) ? "filter-chip--active" : ""}`} onClick={() => setSelectedModalities(toggleValue(selectedModalities, modality))}>{modality}</button>
        ))}
        <button type="button" className={`filter-chip ${scope === "favorites" ? "filter-chip--active" : ""}`} onClick={() => setScope(scope === "favorites" ? "all" : "favorites")}><Heart size={14} />お気に入り</button>
        <button type="button" className={`filter-chip ${scope === "review" ? "filter-chip--active" : ""}`} onClick={() => setScope(scope === "review" ? "all" : "review")}><CircleAlert size={14} />要確認</button>
        <button type="button" className={`filter-chip ${filtersOpen ? "filter-chip--active" : ""}`} aria-expanded={filtersOpen} onClick={() => setFiltersOpen((value) => !value)}><SlidersHorizontal size={15} />詳細分類{activeFilterCount > 0 && ` ${activeFilterCount}`}</button>
      </section>

      {filtersOpen && (
        <section className="classification-panel" aria-label="詳細な絞り込み">
          <FilterGroup title="モダリティ" values={modalities} selected={selectedModalities} onChange={setSelectedModalities} />
          <FilterGroup title="解剖部位" values={bodyRegions} selected={selectedRegions} onChange={setSelectedRegions} />
          <FilterGroup title="テーマ" values={themes} selected={selectedThemes} onChange={setSelectedThemes} />
          {availableTags.length > 0 && <FilterGroup title="タグ（複数選択はすべて一致）" values={availableTags} selected={selectedTags} onChange={setSelectedTags} />}
          {activeFilterCount > 0 && <button className="clear-filters" type="button" onClick={clearFilters}><X size={14} />絞り込みを解除</button>}
        </section>
      )}

      <section className="content-section" aria-labelledby="recent-title">
        <div className="section-heading">
          <div><p className="section-kicker">LIBRARY</p><h2 id="recent-title">{query || activeFilterCount ? "検索結果" : "最近のノート"}</h2></div>
          <div className="result-controls"><span>{visibleNotes.length}件</span><label><span className="sr-only">並び順</span><select value={sortOrder} onChange={(event) => setSortOrder(event.target.value as SortOrder)}><option value="relevance">関連度</option><option value="updated">更新日</option><option value="title">タイトル</option></select></label></div>
        </div>
        {loading ? <p className="loading-message">ノートを読み込んでいます…</p> : error ? <p className="error-message">{error}</p> : (
          <div className="notes-grid">
            {visibleNotes.map((note) => <NoteCard key={note.id} note={note} onToggleFavorite={(item) => void toggleFavorite(item)} />)}
          </div>
        )}
        {!loading && !error && visibleNotes.length === 0 && <p className="empty-state">該当するノートはありません。</p>}
      </section>
    </main>
  );
}

function FilterGroup({ title, values, selected, onChange }: { title: string; values: readonly string[]; selected: string[]; onChange: (values: string[]) => void }) {
  return (
    <fieldset className="classification-group">
      <legend>{title}</legend>
      <div>{values.map((value) => <button className={selected.includes(value) ? "selected" : ""} key={value} type="button" aria-pressed={selected.includes(value)} onClick={() => onChange(toggleValue(selected, value))}>{value}</button>)}</div>
    </fieldset>
  );
}

function toggleValue(values: string[], value: string) {
  return values.includes(value) ? values.filter((item) => item !== value) : [...values, value];
}
