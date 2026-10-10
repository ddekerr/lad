"use client";

import Link from "next/link";
import { useCallback, useEffect, useRef, useState } from "react";
import { shouldPreferFlats, transposeKey } from "@/lib/chords";
import type { Dictionary } from "@/lib/i18n/dictionaries";
import { IconClose, IconMinus, IconPause, IconPlay, IconPlus } from "./icons";
import { SongBody } from "./SongBody";

type Props = {
  title: string;
  originalKey: string;
  body: string;
  initialShift: number;
  backHref: string;
  t: Dictionary;
};

const MIN_SIZE = 20;
const MAX_SIZE = 80;
const HIDE_BARS_AFTER_MS = 3000;

/**
 * Режим сцени: темний повноекранний вигляд, великий текст, автопрокрутка,
 * зміна розміру шрифту й тональності. Дотик на текст ставить прокрутку на паузу.
 */
export function StageClient({ title, originalKey, body, initialShift, backHref, t }: Props) {
  const [size, setSize] = useState(36);
  const [shift, setShift] = useState(((initialShift % 12) + 12) % 12);
  const [speed, setSpeed] = useState(4);
  const [playing, setPlaying] = useState(false);
  const [barsVisible, setBarsVisible] = useState(true);
  const scrollRef = useRef<HTMLDivElement>(null);

  const preferFlats = shouldPreferFlats(originalKey, shift);
  const currentKey = transposeKey(originalKey, shift);
  const step = (delta: number) => setShift((s) => (((s + delta) % 12) + 12) % 12);

  // Автопрокрутка: швидкість 1..10 це 8..80 px за секунду.
  useEffect(() => {
    if (!playing) return;
    let frame = 0;
    let last = performance.now();
    let carry = 0;

    const tick = (now: number) => {
      const el = scrollRef.current;
      carry += (speed * 8 * (now - last)) / 1000;
      last = now;
      if (el) {
        const whole = Math.floor(carry);
        if (whole >= 1) {
          el.scrollTop += whole;
          carry -= whole;
        }
        if (el.scrollTop + el.clientHeight >= el.scrollHeight - 1) {
          setPlaying(false);
          return;
        }
      }
      frame = requestAnimationFrame(tick);
    };

    frame = requestAnimationFrame(tick);
    return () => cancelAnimationFrame(frame);
  }, [playing, speed]);

  // Панелі ховаються через кілька секунд, поки йде прокрутка.
  useEffect(() => {
    if (!playing || !barsVisible) return;
    const timer = setTimeout(() => setBarsVisible(false), HIDE_BARS_AFTER_MS);
    return () => clearTimeout(timer);
  }, [playing, barsVisible]);

  // Екран не гасне, поки відкрито режим сцени (Wake Lock API, не всюди підтримується).
  useEffect(() => {
    let lock: WakeLockSentinel | null = null;
    const request = async () => {
      try {
        if ("wakeLock" in navigator) lock = await navigator.wakeLock.request("screen");
      } catch {
        // старий браузер або вкладка неактивна: просто без блокування
      }
    };
    const onVisibility = () => {
      if (document.visibilityState === "visible") void request();
    };
    void request();
    document.addEventListener("visibilitychange", onVisibility);
    return () => {
      document.removeEventListener("visibilitychange", onVisibility);
      lock?.release().catch(() => undefined);
    };
  }, []);

  const onTapText = useCallback(() => {
    setPlaying((p) => !p);
    setBarsVisible(true);
  }, []);

  const barClass =
    "flex-none transition-opacity duration-300 " +
    (barsVisible ? "opacity-100" : "pointer-events-none opacity-0");

  return (
    <div className="fixed inset-0 flex flex-col bg-ink text-cream">
      <header
        className={`${barClass} flex min-h-16 items-center justify-between gap-3 border-b border-line px-3 sm:px-6`}
      >
        <div className="flex min-w-0 items-center gap-3">
          <Link
            href={backHref}
            aria-label={t.stage.close}
            className="flex size-11 flex-none items-center justify-center rounded-[12px] bg-line"
          >
            <IconClose size={22} />
          </Link>
          <div className="truncate font-semibold">{title}</div>
        </div>

        <div className="flex flex-none items-center gap-2 sm:gap-5">
          <div role="group" aria-label={t.stage.larger} className="flex items-center gap-1.5">
            <button
              type="button"
              aria-label={t.stage.smaller}
              onClick={() => setSize((s) => Math.max(MIN_SIZE, s - 4))}
              className="size-11 rounded-[12px] bg-taupe font-bold text-ink"
            >
              A−
            </button>
            <button
              type="button"
              aria-label={t.stage.larger}
              onClick={() => setSize((s) => Math.min(MAX_SIZE, s + 4))}
              className="size-11 rounded-[12px] bg-taupe text-lg font-bold text-ink"
            >
              A+
            </button>
          </div>
          <div role="group" aria-label={t.stage.key} className="flex items-center gap-1.5">
            <button
              type="button"
              aria-label={t.stage.transposeDown}
              onClick={() => step(-1)}
              className="flex size-11 items-center justify-center rounded-[12px] bg-taupe text-ink"
            >
              <IconMinus size={20} />
            </button>
            <div
              aria-live="polite"
              className="flex h-11 min-w-12 items-center justify-center rounded-[12px] bg-surface px-2 font-heading font-bold"
            >
              {currentKey}
            </div>
            <button
              type="button"
              aria-label={t.stage.transposeUp}
              onClick={() => step(1)}
              className="flex size-11 items-center justify-center rounded-[12px] bg-taupe text-ink"
            >
              <IconPlus size={20} />
            </button>
          </div>
        </div>
      </header>

      <main
        ref={scrollRef}
        onClick={onTapText}
        className="flex-1 cursor-pointer overflow-y-auto px-4 py-8 sm:px-12"
      >
        <div className="mx-auto max-w-4xl pb-[60vh]">
          <SongBody
            body={body}
            mode="both"
            shift={shift}
            preferFlats={preferFlats}
            textSize={size}
          />
        </div>
      </main>

      <footer
        className={`${barClass} flex min-h-20 items-center justify-center gap-5 border-t border-line px-4`}
      >
        <button
          type="button"
          onClick={() => {
            setPlaying((p) => !p);
            setBarsVisible(true);
          }}
          aria-label={playing ? t.stage.pause : t.stage.play}
          className="flex size-16 flex-none items-center justify-center rounded-full bg-amber text-ink"
        >
          {playing ? <IconPause size={28} /> : <IconPlay size={28} />}
        </button>
        <div className="flex max-w-sm flex-1 items-center gap-3">
          <label htmlFor="speed" className="text-sm text-muted">
            {t.stage.speed}
          </label>
          <input
            id="speed"
            type="range"
            min={1}
            max={10}
            value={speed}
            onChange={(e) => setSpeed(Number(e.target.value))}
            className="flex-1 accent-amber"
          />
        </div>
      </footer>
    </div>
  );
}
