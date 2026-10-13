/** Перевірка введення для персональних копій пісень (чиста логіка, без БД). */

export const MAX_TITLE = 200;
export const MAX_BODY = 50_000;
export const MAX_NOTES = 5_000;

export type CopyPatch = {
  title?: string;
  artist?: string;
  body?: string;
  notes?: string;
  keyShift?: number;
};

export type PatchResult = { ok: true; data: CopyPatch } | { ok: false; error: string };

/** Розбирає тіло PATCH для копії: лише дозволені поля, з обмеженнями довжини. */
export function parseCopyPatch(input: unknown): PatchResult {
  if (typeof input !== "object" || input === null) return { ok: false, error: "invalid_body" };
  const raw = input as Record<string, unknown>;
  const data: CopyPatch = {};

  if (raw.title !== undefined) {
    if (typeof raw.title !== "string" || !raw.title.trim() || raw.title.length > MAX_TITLE) {
      return { ok: false, error: "invalid_title" };
    }
    data.title = raw.title.trim();
  }
  if (raw.artist !== undefined) {
    if (typeof raw.artist !== "string" || raw.artist.length > MAX_TITLE) {
      return { ok: false, error: "invalid_artist" };
    }
    data.artist = raw.artist.trim();
  }
  if (raw.body !== undefined) {
    if (typeof raw.body !== "string" || raw.body.length > MAX_BODY) {
      return { ok: false, error: "invalid_body" };
    }
    data.body = raw.body;
  }
  if (raw.notes !== undefined) {
    if (typeof raw.notes !== "string" || raw.notes.length > MAX_NOTES) {
      return { ok: false, error: "invalid_notes" };
    }
    data.notes = raw.notes;
  }
  if (raw.keyShift !== undefined) {
    if (typeof raw.keyShift !== "number" || !Number.isInteger(raw.keyShift)) {
      return { ok: false, error: "invalid_key_shift" };
    }
    data.keyShift = ((raw.keyShift % 12) + 12) % 12;
  }

  if (Object.keys(data).length === 0) return { ok: false, error: "empty_patch" };
  return { ok: true, data };
}
