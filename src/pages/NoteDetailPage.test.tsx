import { cleanup, fireEvent, render, screen, waitFor } from "@testing-library/react";
import { afterEach, describe, expect, it, vi } from "vitest";
import { MemoryRouter, Route, Routes } from "react-router-dom";
import { KnowledgeBaseProvider } from "../app/KnowledgeBaseContext";
import { DemoNoteRepository } from "../data/demoRepository";
import { NoteDetailPage } from "./NoteDetailPage";

afterEach(() => {
  cleanup();
  vi.restoreAllMocks();
});

function renderPage() {
  render(
    <MemoryRouter initialEntries={["/notes/mri-brain-axial"]}>
      <KnowledgeBaseProvider repository={new DemoNoteRepository()}>
        <Routes><Route path="/notes/:id" element={<NoteDetailPage />} /></Routes>
      </KnowledgeBaseProvider>
    </MemoryRouter>,
  );
}

describe("NoteDetailPage", () => {
  it("気になった点を含む深掘り依頼文をコピーする", async () => {
    const writeText = vi.fn().mockResolvedValue(undefined);
    Object.defineProperty(navigator, "clipboard", { configurable: true, value: { writeText } });
    renderPage();

    await screen.findByRole("heading", { name: "MRI撮影断面ノート（入力サンプル）" });
    fireEvent.click(screen.getByText("詳しく調べる"));
    fireEvent.change(screen.getByRole("textbox", { name: "気になったところ（任意）" }), { target: { value: "基準線の根拠" } });
    fireEvent.click(screen.getByRole("button", { name: "依頼文をコピー" }));

    await waitFor(() => expect(writeText).toHaveBeenCalledWith(expect.stringContaining("基準線の根拠")));
    expect(writeText).toHaveBeenCalledWith(expect.stringContaining("登録前に内容と出典を提示"));
    expect(await screen.findByRole("button", { name: "コピーしました" })).toBeInTheDocument();
  });
});
