import { describe, expect, it } from "vitest";
import type { NoteInput } from "../types";
import { DemoNoteRepository } from "./demoRepository";
import { VersionConflictError } from "./repository";

const newNote: NoteInput = {
  title: "テストノート",
  summary: "保存処理のテスト",
  body: "## 本文",
  modalities: ["CT"],
  bodyRegions: ["胸部"],
  themes: ["撮影範囲"],
  tags: ["テスト"],
  publicationStatus: "draft",
  verificationStatus: "self",
  favorite: false,
  sources: [],
};

describe("DemoNoteRepository", () => {
  it("ノートを作成し、版番号を付ける", async () => {
    const repository = new DemoNoteRepository();
    const created = await repository.createNote(newNote);

    expect(created.id).toBeTruthy();
    expect(created.version).toBe(1);
    expect(created.title).toBe("テストノート");
    expect(await repository.getNote(created.id)).toEqual(created);
  });

  it("古い版からの更新を競合として拒否する", async () => {
    const repository = new DemoNoteRepository();
    const created = await repository.createNote(newNote);
    await repository.updateNote(created.id, { ...newNote, expectedVersion: created.version });

    await expect(repository.updateNote(created.id, { ...newNote, expectedVersion: created.version }))
      .rejects.toBeInstanceOf(VersionConflictError);
  });

  it("お気に入り変更だけでは確認区分を変えない", async () => {
    const repository = new DemoNoteRepository();
    const original = await repository.getNote("mri-brain-axial");
    expect(original).not.toBeNull();

    const updated = await repository.toggleFavorite(original!.id, false, original!.version);

    expect(updated.favorite).toBe(false);
    expect(updated.verificationStatus).toBe("self");
    expect(updated.version).toBe(original!.version + 1);
  });

  it("過去版を新しい版として復元する", async () => {
    const repository = new DemoNoteRepository();
    const created = await repository.createNote(newNote);
    const changed = await repository.updateNote(created.id, { ...newNote, body: "## 変更後", expectedVersion: created.version });
    const [history] = await repository.listVersions(created.id);

    expect(history.version).toBe(1);
    expect(history.snapshot.body).toBe("## 本文");

    const restored = await repository.restoreVersion(created.id, history.id, changed.version);
    expect(restored.body).toBe("## 本文");
    expect(restored.version).toBe(3);
    expect(restored.verificationStatus).toBe("self");
  });
});
