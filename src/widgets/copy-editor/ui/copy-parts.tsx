'use client';

import { useRouter } from 'next/navigation';
import { useState } from 'react';
import { buildPartTab, PART_DIFFICULTIES, PartTab, type PartDifficulty, type PartView } from '@/entities/song-copy';
import { fmt, type Dictionary } from '@/shared/i18n';

type Props = {
  copyId: string;
  originalKey: string;
  /** Поточний зсув тональності копії: партія показується в ній */
  shift: number;
  parts: PartView[];
  /** Збережені налаштування копії дозволяють генерацію */
  canGenerate: boolean;
  t: Dictionary;
};

type ApiError = { error?: string; max?: number; limit?: number };

const MAX_BARS_HINT = 128;

function errorText(t: Dictionary, data: ApiError | null): string {
  const errors: Record<string, string> = t.parts.errors;
  return fmt(errors[data?.error ?? ''] ?? errors.generic, {
    max: data?.max ?? MAX_BARS_HINT,
    limit: data?.limit ?? '',
  });
}

/** Партії баса для копії: три рівні, генерація ШІ, показ по тактах, видалення. */
export function CopyParts({ copyId, originalKey, shift, parts, canGenerate, t }: Props) {
  const router = useRouter();
  const [busy, setBusy] = useState<PartDifficulty | null>(null);
  const [error, setError] = useState<{ level: PartDifficulty; text: string } | null>(null);
  const [open, setOpen] = useState<PartDifficulty | null>(null);
  const [confirmDelete, setConfirmDelete] = useState<PartDifficulty | null>(null);

  async function generate(level: PartDifficulty) {
    setBusy(level);
    setError(null);
    const res = await fetch(`/api/copies/${copyId}/parts`, {
      method: 'POST',
      headers: { 'content-type': 'application/json' },
      body: JSON.stringify({ difficulty: level }),
    }).catch(() => null);
    setBusy(null);
    if (res?.ok) {
      setOpen(level);
      router.refresh();
      return;
    }
    const data = (await res?.json().catch(() => null)) as ApiError | null;
    setError({ level, text: errorText(t, data) });
  }

  async function remove(level: PartDifficulty) {
    setConfirmDelete(null);
    const res = await fetch(`/api/copies/${copyId}/parts?difficulty=${level}`, { method: 'DELETE' }).catch(() => null);
    if (res?.ok) router.refresh();
    else setError({ level, text: errorText(t, null) });
  }

  return (
    <section aria-labelledby="parts-title" className="flex flex-col gap-4 rounded-card bg-surface p-5 sm:p-8">
      <div>
        <h2 id="parts-title" className="font-heading text-lg font-bold">
          {t.parts.title}
        </h2>
        <p className="text-sm text-muted">{t.parts.intro}</p>
      </div>

      {!canGenerate && <p className="text-sm text-muted">{t.parts.notReady}</p>}

      <ul className="flex flex-col gap-3">
        {PART_DIFFICULTIES.map((level) => {
          const part = parts.find((item) => item.difficulty === level);
          const generating = busy === level;
          return (
            <li key={level} className="flex flex-col gap-3 rounded-tile bg-ink p-4">
              <div className="flex flex-wrap items-center justify-between gap-3">
                <div className="flex flex-col">
                  <span className="font-semibold">{t.parts[level]}</span>
                  <span className={'text-sm ' + (part?.stale ? 'text-amber' : part ? 'text-success' : 'text-muted')}>
                    {!part ? t.parts.none : part.stale ? t.parts.outdated : t.parts.ready}
                  </span>
                </div>
                <div className="flex flex-wrap gap-2">
                  {part && (
                    <button
                      type="button"
                      onClick={() => setOpen(open === level ? null : level)}
                      aria-expanded={open === level}
                      className="min-h-11 rounded-tile bg-line px-4 font-semibold text-cream hover:bg-taupe hover:text-ink"
                    >
                      {open === level ? t.parts.hide : t.parts.show}
                    </button>
                  )}
                  <button
                    type="button"
                    disabled={!canGenerate || busy !== null}
                    onClick={() => generate(level)}
                    className="min-h-11 rounded-tile bg-amber px-4 font-semibold text-ink hover:bg-amber-active disabled:cursor-not-allowed disabled:bg-line disabled:text-dim disabled:hover:bg-line disabled:hover:text-dim"
                  >
                    {generating ? t.parts.generating : part ? t.parts.regenerate : t.parts.generate}
                  </button>
                  {part && confirmDelete !== level && (
                    <button
                      type="button"
                      disabled={busy !== null}
                      onClick={() => setConfirmDelete(level)}
                      className="min-h-11 rounded-tile px-3 text-sm text-danger underline underline-offset-4"
                    >
                      {t.parts.remove}
                    </button>
                  )}
                </div>
              </div>

              {confirmDelete === level && (
                <div className="flex flex-wrap items-center gap-3 text-sm">
                  <span>{t.parts.removeConfirm}</span>
                  <button
                    type="button"
                    onClick={() => remove(level)}
                    className="min-h-11 rounded-tile bg-danger px-4 font-semibold text-ink"
                  >
                    {t.parts.remove}
                  </button>
                  <button
                    type="button"
                    onClick={() => setConfirmDelete(null)}
                    className="min-h-11 rounded-tile bg-line px-4"
                  >
                    {t.parts.cancel}
                  </button>
                </div>
              )}

              {error?.level === level && (
                <p role="alert" className="text-sm text-danger">
                  {error.text}
                </p>
              )}

              {part && open === level && (
                <div className="flex flex-col gap-2">
                  <p className="text-xs text-muted">{t.parts.howToRead}</p>
                  <div className="overflow-x-auto pb-2">
                    <PartTab
                      tab={buildPartTab(part.data, originalKey, shift)}
                      size={18}
                      label={t.parts.tabLabel}
                      sectionLabel={(id) => (t.sections.names as Record<string, string>)[id] ?? id}
                    />
                  </div>
                </div>
              )}
            </li>
          );
        })}
      </ul>
    </section>
  );
}
