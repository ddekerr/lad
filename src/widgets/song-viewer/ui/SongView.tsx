"use client";

import Link from "next/link";
import { useState } from "react";
import { SongBody, type DisplayMode } from "@/entities/song";
import type { Dictionary } from "@/shared/i18n";
import { shouldPreferFlats, transposeKey } from "@/shared/lib/chords";
import { IconExpand, IconMinus, IconPlus } from "@/shared/ui";

type Props = {
  id: string;
  body: string;
  originalKey: string;
  t: Dictionary;
};

/**
 * Перегляд пісні: режими відображення й зміна тональності. Усе лише в браузері,
 * база не змінюється (гість теж може).
 */
export function SongView({ id, body, originalKey, t }: Props) {
  const [mode, setMode] = useState<DisplayMode>("both");
  const [shift, setShift] = useState(0);

  const preferFlats = shouldPreferFlats(originalKey, shift);
  const currentKey = transposeKey(originalKey, shift);
  const step = (delta: number) => setShift((s) => (((s + delta) % 12) + 12) % 12);

  const modes: { value: DisplayMode; label: string }[] = [
    { value: "text", label: t.song.modeText },
    { value: "chords", label: t.song.modeChords },
    { value: "both", label: t.song.modeBoth },
  ];

  return (
    <div className="flex flex-col gap-6 lg:flex-row lg:items-start">
      <section
        aria-label={t.song.display}
        className="min-w-0 flex-1 overflow-x-auto rounded-card bg-surface p-5 sm:p-8"
      >
        <SongBody body={body} mode={mode} shift={shift} preferFlats={preferFlats} />
      </section>

      <aside className="flex flex-col gap-6 rounded-card bg-surface p-5 lg:sticky lg:top-6 lg:w-80 lg:flex-none">
        <fieldset className="flex flex-col gap-2">
          <legend className="mb-2 font-semibold">{t.song.display}</legend>
          {modes.map((m) => (
            <label key={m.value} className="flex min-h-9 items-center gap-3">
              <input
                type="radio"
                name="mode"
                value={m.value}
                checked={mode === m.value}
                onChange={() => setMode(m.value)}
                className="size-5 accent-amber"
              />
              {m.label}
            </label>
          ))}
        </fieldset>

        <div className="flex flex-col gap-2">
          <div className="font-semibold">{t.song.key}</div>
          <div className="flex items-center gap-2">
            <button
              type="button"
              onClick={() => step(-1)}
              aria-label={t.song.transposeDown}
              className="flex size-11 items-center justify-center rounded-tile bg-taupe text-ink"
            >
              <IconMinus size={18} />
            </button>
            <div
              aria-live="polite"
              className="flex h-11 flex-1 items-center justify-center rounded-tile bg-ink font-heading text-lg font-bold"
            >
              {currentKey}
            </div>
            <button
              type="button"
              onClick={() => step(1)}
              aria-label={t.song.transposeUp}
              className="flex size-11 items-center justify-center rounded-tile bg-taupe text-ink"
            >
              <IconPlus size={18} />
            </button>
          </div>
          {shift !== 0 && (
            <button
              type="button"
              onClick={() => setShift(0)}
              className="self-start text-sm text-amber underline underline-offset-4"
            >
              {t.song.resetKey} ({originalKey})
            </button>
          )}
          <p className="text-sm text-muted">{t.song.keyHint}</p>
        </div>

        <Link
          href={`/songs/${id}/stage?shift=${shift}`}
          className="flex min-h-11 items-center justify-center gap-2 rounded-tile bg-amber px-5 font-semibold text-ink hover:bg-amber-active"
        >
          <IconExpand size={18} />
          {t.song.stageMode}
        </Link>
      </aside>
    </div>
  );
}
