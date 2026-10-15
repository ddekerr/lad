'use client';

import { useRouter } from 'next/navigation';
import { useRef, useState, type ChangeEvent } from 'react';
import { MAX_IMPORT_BYTES, MAX_IMPORT_SONGS, type ImportIssue, type ImportItemError } from '@/entities/song';
import { fmt, type Dictionary } from '@/shared/i18n';
import { IconClose } from '@/shared/ui';

type Status =
  | { kind: 'idle' }
  | { kind: 'busy' }
  | { kind: 'done'; imported: number; ignoredFields: string[] }
  | { kind: 'failed'; message: string; items: ImportItemError[]; total: number };

type ImportResponse = {
  imported?: number;
  ignoredFields?: string[];
  error?: string;
  items?: ImportItemError[];
  total?: number;
};

function errorText(t: Dictionary, code: string): string {
  const errors: Record<string, string> = t.songImport.errors;
  return fmt(errors[code] ?? errors.generic, { max: MAX_IMPORT_SONGS, size: MAX_IMPORT_BYTES / 1024 / 1024 });
}

function issueText(t: Dictionary, issue: ImportIssue): string {
  if (issue.code === 'not_an_object') return t.songImport.notAnObject;
  return issue.code === 'missing' ? t.songImport.missing : t.songImport.invalid;
}

/** Кнопка імпорту пісень із JSON-файлу (Editor). Результат і помилки показує у вікні під кнопкою. */
export function ImportSongs({ t }: { t: Dictionary }) {
  const router = useRouter();
  const fileInput = useRef<HTMLInputElement>(null);
  const [status, setStatus] = useState<Status>({ kind: 'idle' });

  const fail = (code: string, items: ImportItemError[] = [], total = items.length) =>
    setStatus({ kind: 'failed', message: errorText(t, code), items, total });

  async function onFile(e: ChangeEvent<HTMLInputElement>) {
    const input = e.currentTarget;
    const file = input.files?.[0];
    if (!file) return;

    setStatus({ kind: 'busy' });
    try {
      if (file.size > MAX_IMPORT_BYTES) return fail('too_large');
      const text = await file.text();

      const res = await fetch('/api/songs/import?format=json', {
        method: 'POST',
        headers: { 'content-type': 'application/json' },
        body: text,
      }).catch(() => null);
      if (!res) return fail('generic');

      const data = (await res.json().catch(() => null)) as ImportResponse | null;
      if (res.ok && typeof data?.imported === 'number') {
        setStatus({ kind: 'done', imported: data.imported, ignoredFields: data.ignoredFields ?? [] });
        router.refresh();
        return;
      }
      if (data?.error === 'invalid_songs') {
        return setStatus({
          kind: 'failed',
          message: t.songImport.failedTitle,
          items: data.items ?? [],
          total: data.total ?? data.items?.length ?? 0,
        });
      }
      fail(data?.error ?? 'generic');
    } catch {
      fail('generic');
    } finally {
      // щоб той самий файл можна було вибрати ще раз після виправлення
      input.value = '';
    }
  }

  const busy = status.kind === 'busy';

  return (
    <div className="relative">
      <input
        ref={fileInput}
        type="file"
        accept=".json,application/json"
        className="hidden"
        onChange={onFile}
        aria-label={t.songImport.button}
      />
      <button
        type="button"
        disabled={busy}
        onClick={() => fileInput.current?.click()}
        className="flex min-h-11 items-center justify-center rounded-tile bg-line px-5 font-semibold hover:bg-taupe hover:text-ink disabled:opacity-50"
      >
        {busy ? t.songImport.busy : t.songImport.button}
      </button>

      {(status.kind === 'done' || status.kind === 'failed') && (
        <div
          role={status.kind === 'failed' ? 'alert' : 'status'}
          className="absolute right-0 top-full z-20 mt-2 w-[min(32rem,calc(100vw-2rem))] rounded-card border border-line bg-surface p-4 text-sm shadow-lg"
        >
          <button
            type="button"
            onClick={() => setStatus({ kind: 'idle' })}
            aria-label={t.songImport.close}
            className="absolute right-3 top-3 flex size-8 items-center justify-center rounded-tile text-muted hover:text-cream"
          >
            <IconClose size={18} />
          </button>

          {status.kind === 'done' ? (
            <div className="flex flex-col gap-1 pr-8">
              <p className="font-semibold text-success">{fmt(t.songImport.done, { count: status.imported })}</p>
              {status.ignoredFields.length > 0 && (
                <p className="text-muted">{fmt(t.songImport.ignored, { fields: status.ignoredFields.join(', ') })}</p>
              )}
            </div>
          ) : (
            <div className="flex flex-col gap-2 pr-8">
              <p className="font-semibold text-danger">{status.message}</p>
              {status.items.length > 0 && (
                <>
                  <ul className="flex max-h-64 flex-col gap-2 overflow-y-auto">
                    {status.items.map((item) => (
                      <li key={item.index}>
                        <span className="font-semibold">
                          {item.title
                            ? fmt(t.songImport.songNamed, { index: item.index, title: item.title })
                            : fmt(t.songImport.song, { index: item.index })}
                        </span>
                        <ul className="text-muted">
                          {item.issues.map((issue) => (
                            <li key={`${item.index}-${issue.field ?? 'item'}`}>
                              {issue.field && <code className="text-cream">{issue.field}</code>}
                              {issue.field ? ': ' : ''}
                              {issueText(t, issue)}
                            </li>
                          ))}
                        </ul>
                      </li>
                    ))}
                  </ul>
                  {status.total > status.items.length && (
                    <p className="text-muted">
                      {fmt(t.songImport.moreProblems, { shown: status.items.length, total: status.total })}
                    </p>
                  )}
                </>
              )}
            </div>
          )}
        </div>
      )}
    </div>
  );
}
