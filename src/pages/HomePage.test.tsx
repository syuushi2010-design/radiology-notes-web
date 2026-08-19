import { cleanup, fireEvent, render, screen, waitFor } from "@testing-library/react";
import { afterEach, describe, expect, it } from "vitest";
import { MemoryRouter } from "react-router-dom";
import { KnowledgeBaseProvider } from "../app/KnowledgeBaseContext";
import { DemoNoteRepository } from "../data/demoRepository";
import { HomePage } from "./HomePage";

afterEach(() => cleanup());

function renderPage() {
  render(
    <MemoryRouter>
      <KnowledgeBaseProvider repository={new DemoNoteRepository()}>
        <HomePage />
      </KnowledgeBaseProvider>
    </MemoryRouter>,
  );
}

describe("HomePage", () => {
  it("日本語キーワードでノートを検索する", async () => {
    renderPage();
    await screen.findByText("MRI撮影断面ノート（入力サンプル）");

    fireEvent.change(screen.getByRole("searchbox", { name: "ノートを検索" }), { target: { value: "撮影範囲" } });

    await waitFor(() => expect(screen.getByText("CT撮影範囲ノート（入力サンプル）")).toBeInTheDocument());
    expect(screen.queryByText("MRI撮影断面ノート（入力サンプル）")).not.toBeInTheDocument();
  });

  it("モダリティで絞り込む", async () => {
    renderPage();
    await screen.findByText("CT撮影範囲ノート（入力サンプル）");

    fireEvent.click(screen.getByRole("button", { name: "MRI" }));

    await waitFor(() => expect(screen.queryByText("CT撮影範囲ノート（入力サンプル）")).not.toBeInTheDocument());
    expect(screen.getByText("MRI撮影断面ノート（入力サンプル）")).toBeInTheDocument();
  });
});
