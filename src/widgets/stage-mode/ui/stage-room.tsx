'use client';

import Link from 'next/link';
import { useCallback, useEffect, useMemo, useRef, useState } from 'react';
import { SongBody, type DisplayMode } from '@/entities/song';
import {
  barOfLine,
  clampBar,
  lineOfBar,
  matchPartBar,
  stepSection,
  type StageCommand,
  type StageItemView,
  type StageStateView,
} from '@/entities/setlist';
import { buildPartTab, PartTab, type PartDifficulty, type PartView } from '@/entities/song-copy';
import { fmt, type Dictionary } from '@/shared/i18n';
import { parseBars } from '@/shared/lib/bars';
import { shouldPreferFlats, transposeKey } from '@/shared/lib/chords';
import {
  IconArrowDown,
  IconArrowUp,
  IconChevronLeft,
  IconChevronRight,
  IconClose,
  IconMinus,
  IconPlus,
} from '@/shared/ui';

type View = DisplayMode | 'part';

type Props = {
  /** Поточний користувач: ведучим є той, хто запустив сцену */
  meId: string;
  items: StageItemView[];
  initial: StageStateView;
  /** Партії баса з власних копій користувача, за id пісні каталогу */
  partsBySong: Record<string, PartView[]>;
  t: Dictionary;
};

const MIN_SIZE = 20;
const MAX_SIZE = 80;
const POLL_MS = 1000;
const PREFS_KEY = 'lad-stage-prefs';

const VIEWS: { value: View; label: 'viewText' | 'viewBoth' | 'viewChords' | 'viewPart' }[] = [
  { value: 'text', label: 'viewText' },
  { value: 'both', label: 'viewBoth' },
  { value: 'chords', label: 'viewChords' },
  { value: 'part', label: 'viewPart' },
];

const roundButton = 'flex size-11 flex-none items-center justify-center rounded-xl bg-taupe text-ink';
const footerButton =
  'flex size-12 flex-none items-center justify-center rounded-xl bg-line text-cream disabled:cursor-not-allowed disabled:bg-line disabled:text-dim';

/**
 * Спільна сцена. Ведучий (хто запустив) вибирає пісню, місце в пісні й тональність, і це бачать усі.
 * Вигляд (текст, акорди, партія), складність партії й розмір тексту в кожного свої.
 */
export function StageRoom({ meId, items, initial, partsBySong, t }: Props) {
  const [stage, setStage] = useState(initial);
  const [ended, setEnded] = useState(false);
  const [offline, setOffline] = useState(false);
  const [confirmEnd, setConfirmEnd] = useState(false);
  const [view, setView] = useState<View>('both');
  const [level, setLevel] = useState<PartDifficulty | null>(null);
  const [size, setSize] = useState(36);
  const revision = useRef(initial.revision);
  const scrollRef = useRef<HTMLElement>(null);

  const isLeader = stage.leaderId === meId;
  const item = items[Math.min(stage.item, items.length - 1)];
  const bars = useMemo(() => parseBars(item.body).bars, [item.body]);
  const bar = clampBar(bars.length, stage.bar);
  const parts = partsBySong[item.songId] ?? [];
  const activePart = parts.find((part) => part.difficulty === level) ?? parts[0] ?? null;
  const preferFlats = shouldPreferFlats(item.originalKey, stage.keyShift);

  // Свої налаштування (вигляд, рівень, розмір) пам'ятаємо на цьому пристрої; без сховища все працює й так.
  useEffect(() => {
    try {
      const saved = JSON.parse(localStorage.getItem(PREFS_KEY) ?? 'null') as {
        view?: View;
        level?: PartDifficulty;
        size?: number;
      } | null;
      if (saved?.view && VIEWS.some((v) => v.value === saved.view)) setView(saved.view);
      if (saved?.level) setLevel(saved.level);
      if (typeof saved?.size === 'number') setSize(Math.max(MIN_SIZE, Math.min(MAX_SIZE, saved.size)));
    } catch {
      // сховище недоступне: лишаємо значення за замовчуванням
    }
  }, []);

  useEffect(() => {
    try {
      localStorage.setItem(PREFS_KEY, JSON.stringify({ view, level, size }));
    } catch {
      // ігноруємо
    }
  }, [view, level, size]);

  // Опитуємо стан сцени: ведучий міняє пісню чи місце, і ми йдемо за ним.
  useEffect(() => {
    if (ended) return;
    let stopped = false;
    let timer: ReturnType<typeof setTimeout>;

    const poll = async () => {
      try {
        const res = await fetch(`/api/stage?rev=${revision.current}`, { cache: 'no-store' });
        if (!res.ok) throw new Error(String(res.status));
        const data = (await res.json()) as { changed?: boolean; stage?: StageStateView | null };
        if (stopped) return;
        setOffline(false);
        if (data.stage === null) {
          setEnded(true);
          return;
        }
        if (data.stage && data.stage.revision >= revision.current) {
          revision.current = data.stage.revision;
          setStage(data.stage);
        }
      } catch {
        if (!stopped) setOffline(true);
      }
      if (!stopped) timer = setTimeout(poll, POLL_MS);
    };

    timer = setTimeout(poll, POLL_MS);
    return () => {
      stopped = true;
      clearTimeout(timer);
    };
  }, [ended]);

  // Екран не гасне, поки відкрито сцену (Wake Lock API, не всюди підтримується).
  useEffect(() => {
    let lock: WakeLockSentinel | null = null;
    const request = async () => {
      try {
        if ('wakeLock' in navigator) lock = await navigator.wakeLock.request('screen');
      } catch {
        // старий браузер або вкладка неактивна: просто без блокування
      }
    };
    const onVisibility = () => {
      if (document.visibilityState === 'visible') void request();
    };
    void request();
    document.addEventListener('visibilitychange', onVisibility);
    return () => {
      document.removeEventListener('visibilitychange', onVisibility);
      lock?.release().catch(() => undefined);
    };
  }, []);

  // Поточне місце підсвічується, і вікно прокручується до нього.
  useEffect(() => {
    const root = scrollRef.current;
    if (!root) return;
    const active = root.querySelector<HTMLElement>('[data-active="true"]');
    if (active) active.scrollIntoView({ block: 'center', behavior: 'smooth' });
    else root.scrollTo({ top: 0, behavior: 'smooth' });
  }, [stage.item, stage.bar, view, activePart?.difficulty]);

  const send = useCallback(
    async (command: StageCommand) => {
      if (!isLeader) return;
      // Одразу показуємо своє: сервер підтвердить і віддасть остаточний стан.
      setStage((current) => {
        if (command.type === 'item') {
          return { ...current, item: command.item, bar: 0, keyShift: items[command.item]?.keyShift ?? 0 };
        }
        if (command.type === 'bar') return { ...current, bar: command.bar };
        return { ...current, keyShift: command.shift };
      });
      const res = await fetch('/api/stage', {
        method: 'PATCH',
        headers: { 'content-type': 'application/json' },
        body: JSON.stringify(command),
      }).catch(() => null);
      const data = (await res?.json().catch(() => null)) as { stage?: StageStateView } | null;
      if (res?.ok && data?.stage) {
        revision.current = data.stage.revision;
        setStage(data.stage);
      } else {
        // не вдалося: наступне опитування поверне справжній стан
        revision.current = 0;
        if (res?.status === 404) setEnded(true);
      }
    },
    [isLeader, items],
  );

  async function endStage() {
    setConfirmEnd(false);
    const res = await fetch('/api/stage', { method: 'DELETE' }).catch(() => null);
    if (res?.ok || res?.status === 404) setEnded(true);
  }

  const goItem = (delta: -1 | 1) => {
    const next = stage.item + delta;
    if (next >= 0 && next < items.length) void send({ type: 'item', item: next });
  };
  const goSection = (direction: 1 | -1) => void send({ type: 'bar', bar: stepSection(bars, bar, direction) });
  const shiftKey = (delta: number) => void send({ type: 'shift', shift: (((stage.keyShift + delta) % 12) + 12) % 12 });

  const selectLine = isLeader
    ? (line: number) => {
        const target = barOfLine(bars, line);
        if (target !== null) void send({ type: 'bar', bar: target });
      }
    : undefined;

  if (ended) {
    return (
      <div className="fixed inset-0 flex flex-col items-center justify-center gap-4 bg-ink px-6 text-center text-cream">
        <h1 className="font-heading text-2xl font-bold">{t.stage.ended}</h1>
        <p className="text-muted">{t.stage.endedHint}</p>
        <Link href="/setlists" className="flex min-h-11 items-center rounded-tile bg-amber px-5 font-semibold text-ink">
          {t.stage.backToSetlists}
        </Link>
      </div>
    );
  }

  const partTab = activePart ? buildPartTab(activePart.data, item.originalKey, stage.keyShift) : null;
  const sectionLabel = (id: string) => (t.sections.names as Record<string, string>)[id] ?? id;

  return (
    <div className="fixed inset-0 flex flex-col bg-ink text-cream">
      <div className="flex-none border-b border-line">
        <header className="flex min-h-16 items-center justify-between gap-3 px-3 sm:px-6">
          <div className="flex min-w-0 items-center gap-3">
            <Link
              href="/setlists"
              aria-label={t.stage.close}
              className="flex size-11 flex-none items-center justify-center rounded-xl bg-line"
            >
              <IconClose size={22} />
            </Link>
            <div className="min-w-0">
              <div className="truncate font-semibold">{item.title}</div>
              <div className="truncate text-xs text-muted">
                {item.artist} · {fmt(t.stage.counter, { n: stage.item + 1, total: items.length })}
              </div>
            </div>
          </div>

          <div className="flex flex-none items-center gap-2 sm:gap-5">
            <div role="group" aria-label={t.stage.larger} className="flex items-center gap-1.5">
              <button
                type="button"
                aria-label={t.stage.smaller}
                onClick={() => setSize((s) => Math.max(MIN_SIZE, s - 4))}
                className={roundButton + ' font-bold'}
              >
                A−
              </button>
              <button
                type="button"
                aria-label={t.stage.larger}
                onClick={() => setSize((s) => Math.min(MAX_SIZE, s + 4))}
                className={roundButton + ' text-lg font-bold'}
              >
                A+
              </button>
            </div>
            <div role="group" aria-label={t.stage.key} className="flex items-center gap-1.5">
              {isLeader && (
                <button
                  type="button"
                  aria-label={t.stage.transposeDown}
                  onClick={() => shiftKey(-1)}
                  className={roundButton}
                >
                  <IconMinus size={20} />
                </button>
              )}
              <div
                aria-live="polite"
                className="flex h-11 min-w-12 items-center justify-center rounded-xl bg-surface px-2 font-heading font-bold"
              >
                {transposeKey(item.originalKey, stage.keyShift)}
              </div>
              {isLeader && (
                <button
                  type="button"
                  aria-label={t.stage.transposeUp}
                  onClick={() => shiftKey(1)}
                  className={roundButton}
                >
                  <IconPlus size={20} />
                </button>
              )}
            </div>
          </div>
        </header>

        <div className="flex flex-wrap items-center justify-center gap-x-6 gap-y-2 px-3 pb-3 sm:px-6">
          <div role="group" aria-label={t.stage.view} className="flex flex-wrap gap-1.5">
            {VIEWS.map((option) => (
              <button
                key={option.value}
                type="button"
                aria-pressed={view === option.value}
                onClick={() => setView(option.value)}
                className={
                  'min-h-11 rounded-xl px-4 font-semibold ' +
                  (view === option.value ? 'bg-amber text-ink' : 'bg-line text-cream hover:bg-taupe hover:text-ink')
                }
              >
                {t.stage[option.label]}
              </button>
            ))}
          </div>
          {view === 'part' && parts.length > 1 && (
            <div role="group" aria-label={t.stage.level} className="flex gap-1.5">
              {parts.map((part) => (
                <button
                  key={part.difficulty}
                  type="button"
                  aria-pressed={activePart?.difficulty === part.difficulty}
                  onClick={() => setLevel(part.difficulty)}
                  className={
                    'min-h-11 rounded-xl px-4 ' +
                    (activePart?.difficulty === part.difficulty
                      ? 'bg-taupe font-semibold text-ink'
                      : 'bg-line text-cream hover:bg-taupe hover:text-ink')
                  }
                >
                  {t.parts[part.difficulty]}
                </button>
              ))}
            </div>
          )}
        </div>
        <p className="px-3 pb-2 text-center text-xs text-muted sm:px-6">
          {isLeader ? `${t.stage.leading} ${t.stage.tapHint}` : fmt(t.stage.following, { name: stage.leaderName })}
          {offline && (
            <span role="status" className="ml-2 text-danger">
              {t.stage.connection}
            </span>
          )}
        </p>
      </div>

      <main ref={scrollRef} className="flex-1 overflow-y-auto px-4 py-8 sm:px-12">
        <div className="mx-auto max-w-4xl pb-[60vh]">
          {view === 'part' ? (
            partTab && activePart ? (
              <PartTab
                tab={partTab}
                size={Math.round(size * 0.6)}
                label={t.parts.tabLabel}
                sectionLabel={sectionLabel}
                activeIndex={bars.length > 0 ? matchPartBar(bars, activePart.data.bars, bar) : null}
                onSelect={
                  isLeader
                    ? (index) => void send({ type: 'bar', bar: matchPartBar(activePart.data.bars, bars, index) })
                    : undefined
                }
              />
            ) : (
              <p className="text-center text-muted">{t.stage.noPart}</p>
            )
          ) : (
            <>
              <SongBody
                body={item.body}
                mode={view}
                shift={stage.keyShift}
                preferFlats={preferFlats}
                textSize={size}
                sectionNames={t.sections.names}
                activeLine={lineOfBar(bars, bar)}
                onLineSelect={selectLine}
              />
              {bars.length === 0 && <p className="mt-6 text-sm text-dim">{t.stage.noBars}</p>}
            </>
          )}
        </div>
      </main>

      {isLeader && (
        <footer className="flex min-h-20 flex-none flex-wrap items-center justify-center gap-3 border-t border-line px-4 py-2 sm:gap-5">
          <button
            type="button"
            aria-label={t.stage.prev}
            disabled={stage.item === 0}
            onClick={() => goItem(-1)}
            className={footerButton}
          >
            <IconChevronLeft size={22} />
          </button>
          <button type="button" aria-label={t.stage.prevSection} onClick={() => goSection(-1)} className={footerButton}>
            <IconArrowUp size={22} />
          </button>
          <button type="button" aria-label={t.stage.nextSection} onClick={() => goSection(1)} className={footerButton}>
            <IconArrowDown size={22} />
          </button>
          <button
            type="button"
            aria-label={t.stage.next}
            disabled={stage.item >= items.length - 1}
            onClick={() => goItem(1)}
            className={footerButton}
          >
            <IconChevronRight size={22} />
          </button>

          {confirmEnd ? (
            <div className="flex items-center gap-2 text-sm">
              <span>{t.stage.endConfirm}</span>
              <button
                type="button"
                onClick={endStage}
                className="min-h-11 rounded-xl bg-danger px-4 font-semibold text-ink"
              >
                {t.stage.end}
              </button>
              <button type="button" onClick={() => setConfirmEnd(false)} className="min-h-11 rounded-xl bg-line px-4">
                {t.setlists.cancel}
              </button>
            </div>
          ) : (
            <button
              type="button"
              onClick={() => setConfirmEnd(true)}
              className="min-h-11 rounded-xl px-3 text-sm text-danger underline underline-offset-4"
            >
              {t.stage.end}
            </button>
          )}
        </footer>
      )}
    </div>
  );
}
