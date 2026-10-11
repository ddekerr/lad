import assert from "node:assert/strict";
import { describe, it } from "node:test";
import {
  copyDataFromSong,
  copyState,
  isSamePermutation,
  moveItem,
  neighbours,
  nextPosition,
  refreshDataFromSong,
  type SongSnapshot,
} from "./copies";
import { cleanPlaylistName, parseCopyPatch, parseRoleFilter } from "./playlist-input";

const song: SongSnapshot = {
  title: "Demo",
  artist: "Artist",
  language: "en",
  originalKey: "G",
  body: "[G]one [D]two",
  version: 3,
};

describe("створення копії", () => {
  it("бере вміст оригіналу, зсув 0, порожні нотатки й поточну версію", () => {
    assert.deepEqual(copyDataFromSong(song), {
      title: "Demo",
      artist: "Artist",
      language: "en",
      originalKey: "G",
      body: "[G]one [D]two",
      keyShift: 0,
      notes: "",
      syncedVersion: 3,
      isStandalone: false,
    });
  });
});

describe("оновлення копії згідно з оригіналом", () => {
  it("замінює вміст і версію, але не чіпає нотатки й зсув", () => {
    const data = refreshDataFromSong({ ...song, body: "[A]new", version: 5 });
    assert.equal(data.body, "[A]new");
    assert.equal(data.syncedVersion, 5);
    assert.equal("notes" in data, false);
    assert.equal("keyShift" in data, false);
  });
});

describe("стан копії", () => {
  const live = { version: 3, deletedAt: null };

  it("current: версії збігаються", () => {
    assert.equal(copyState({ isStandalone: false, syncedVersion: 3, sourceSong: live }), "current");
  });

  it("outdated: оригінал новіший", () => {
    assert.equal(
      copyState({ isStandalone: false, syncedVersion: 2, sourceSong: live }),
      "outdated",
    );
  });

  it("outdated, якщо версія копії невідома", () => {
    assert.equal(
      copyState({ isStandalone: false, syncedVersion: null, sourceSong: live }),
      "outdated",
    );
  });

  it("original_deleted: м'яке видалення", () => {
    assert.equal(
      copyState({
        isStandalone: false,
        syncedVersion: 3,
        sourceSong: { version: 3, deletedAt: new Date() },
      }),
      "original_deleted",
    );
  });

  it("original_deleted: оригінал остаточно зник", () => {
    assert.equal(
      copyState({ isStandalone: false, syncedVersion: 3, sourceSong: null }),
      "original_deleted",
    );
  });

  it("standalone має пріоритет над усім", () => {
    assert.equal(
      copyState({ isStandalone: true, syncedVersion: 1, sourceSong: null }),
      "standalone",
    );
    assert.equal(
      copyState({
        isStandalone: true,
        syncedVersion: 1,
        sourceSong: { version: 9, deletedAt: new Date() },
      }),
      "standalone",
    );
  });
});

describe("порядок у плейлисті", () => {
  it("nextPosition: з нуля й після останньої", () => {
    assert.equal(nextPosition([]), 0);
    assert.equal(nextPosition([0, 1, 2]), 3);
    assert.equal(nextPosition([0, 5]), 6);
  });

  it("moveItem рухає на крок і не виходить за межі", () => {
    assert.deepEqual(moveItem(["a", "b", "c"], "b", -1), ["b", "a", "c"]);
    assert.deepEqual(moveItem(["a", "b", "c"], "b", 1), ["a", "c", "b"]);
    assert.deepEqual(moveItem(["a", "b", "c"], "a", -1), ["a", "b", "c"]);
    assert.deepEqual(moveItem(["a", "b", "c"], "c", 1), ["a", "b", "c"]);
    assert.deepEqual(moveItem(["a", "b"], "zzz", 1), ["a", "b"]);
  });

  it("moveItem не змінює вхідний масив", () => {
    const input = ["a", "b"];
    moveItem(input, "a", 1);
    assert.deepEqual(input, ["a", "b"]);
  });

  it("isSamePermutation: ті самі елементи в іншому порядку", () => {
    assert.equal(isSamePermutation(["a", "b", "c"], ["c", "a", "b"]), true);
    assert.equal(isSamePermutation(["a", "b"], ["a", "a"]), false);
    assert.equal(isSamePermutation(["a", "b"], ["a"]), false);
    assert.equal(isSamePermutation(["a", "b"], ["a", "x"]), false);
    assert.equal(isSamePermutation([], []), true);
  });

  it("neighbours: попередня й наступна пісня", () => {
    assert.deepEqual(neighbours(["a", "b", "c"], "b"), { prev: "a", next: "c", index: 1 });
    assert.deepEqual(neighbours(["a", "b", "c"], "a"), { prev: null, next: "b", index: 0 });
    assert.deepEqual(neighbours(["a", "b", "c"], "c"), { prev: "b", next: null, index: 2 });
    assert.deepEqual(neighbours(["a"], "zzz"), { prev: null, next: null, index: -1 });
  });
});

describe("введення плейлистів і копій", () => {
  it("назва плейлиста", () => {
    assert.equal(cleanPlaylistName("  Sunday set "), "Sunday set");
    assert.equal(cleanPlaylistName("   "), null);
    assert.equal(cleanPlaylistName("x".repeat(81)), null);
    assert.equal(cleanPlaylistName(5), null);
  });

  it("фільтр ролі з query", () => {
    assert.deepEqual(parseRoleFilter(null), { kind: "all" });
    assert.deepEqual(parseRoleFilter(""), { kind: "all" });
    assert.deepEqual(parseRoleFilter("none"), { kind: "none" });
    assert.deepEqual(parseRoleFilter("abc"), { kind: "role", roleId: "abc" });
  });

  it("PATCH копії: нормалізує зсув і обрізає пробіли", () => {
    assert.deepEqual(parseCopyPatch({ keyShift: 14, title: "  T " }), {
      ok: true,
      data: { keyShift: 2, title: "T" },
    });
    assert.deepEqual(parseCopyPatch({ keyShift: -1 }), { ok: true, data: { keyShift: 11 } });
  });

  it("PATCH копії: відхиляє хибні значення й порожній запит", () => {
    assert.deepEqual(parseCopyPatch({ keyShift: 1.5 }), { ok: false, error: "invalid_key_shift" });
    assert.deepEqual(parseCopyPatch({ title: "" }), { ok: false, error: "invalid_title" });
    assert.deepEqual(parseCopyPatch({ notes: "x".repeat(5001) }), { ok: false, error: "invalid_notes" });
    assert.deepEqual(parseCopyPatch({ body: 1 }), { ok: false, error: "invalid_body" });
    assert.deepEqual(parseCopyPatch({}), { ok: false, error: "empty_patch" });
    assert.deepEqual(parseCopyPatch(null), { ok: false, error: "invalid_body" });
  });

  it("PATCH копії ігнорує сторонні поля (захист від масового присвоєння)", () => {
    assert.deepEqual(parseCopyPatch({ notes: "n", playlistId: "x", sourceSongId: "y" }), {
      ok: true,
      data: { notes: "n" },
    });
  });
});
