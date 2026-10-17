/**
 * Такти в тексті пісні (чиста логіка). Межі тактів позначаються вертикальною рискою `|`:
 *   | [Am]Слова [G]тут | [F]ще слова |
 *
 * Правила:
 *  - якщо в тексті є хоч одна риска, такт це все між двома рисками (через рядки теж);
 *  - такт без акорда (лише слова чи порожній між рисками) продовжує попередній акорд;
 *  - якщо рисок немає зовсім, кожен акорд це окремий такт;
 *  - акорди в такті ділять його порівну, тож їх кількість має ділити кількість долей без залишку.
 */
import { parseLine } from '@/shared/lib/chords';
import { IMPLICIT_SECTION_ID, parseSectionMarker, sectionId } from '@/shared/lib/sections';

export type Bar = {
  /** Номер такту в пісні, з одиниці */
  index: number;
  /** Ідентифікатор розділу, до якого належить такт */
  section: string;
  /** Рядок тексту (з одиниці), де такт починається */
  line: number;
  /** Акорди такту в порядку появи; для такту без акорда це продовжений попередній */
  chords: string[];
  /** true: акорд узято з попереднього такту */
  held: boolean;
};

export type BarsResult = {
  /** true: у тексті є риски `|`; false: кожен акорд це окремий такт */
  marked: boolean;
  bars: Bar[];
};

type Draft = { section: string; line: number; chords: string[] };

function isMarked(lines: string[]): boolean {
  return lines.some((raw) => parseSectionMarker(raw) === null && raw.includes('|'));
}

export function parseBars(body: string): BarsResult {
  const lines = body.replace(/\r\n?/g, '\n').split('\n');
  const marked = isMarked(lines);
  const drafts: Draft[] = [];
  let section = IMPLICIT_SECTION_ID;

  if (!marked) {
    lines.forEach((raw, i) => {
      const marker = parseSectionMarker(raw);
      if (marker) {
        if (marker.kind === 'section') section = sectionId(marker);
        return;
      }
      for (const segment of parseLine(raw)) {
        if (segment.chord) drafts.push({ section, line: i + 1, chords: [segment.chord] });
      }
    });
    return { marked, bars: finish(drafts) };
  }

  let current: { chords: string[]; hasText: boolean; line: number } | null = null;
  const flush = (explicit: boolean, afterBar: boolean, sectionNow: string, line: number) => {
    if (current && (current.chords.length > 0 || current.hasText)) {
      drafts.push({ section: sectionNow, line: current.line, chords: current.chords });
    } else if (explicit && afterBar && drafts.length > 0) {
      // два рядки підряд (`| |` чи `||`): такт без нічого, тримає попередній акорд
      drafts.push({ section: sectionNow, line, chords: [] });
    }
    current = null;
  };

  lines.forEach((raw, i) => {
    const marker = parseSectionMarker(raw);
    if (marker) {
      if (marker.kind === 'section') {
        flush(false, false, section, i + 1);
        section = sectionId(marker);
      }
      return;
    }
    const parts = raw.split('|');
    parts.forEach((part, partIndex) => {
      const chords = parseLine(part).flatMap((segment) => (segment.chord ? [segment.chord] : []));
      const hasText = part.replace(/\[[^\]]*\]/g, '').trim() !== '';
      if (chords.length > 0 || hasText) {
        current ??= { chords: [], hasText: false, line: i + 1 };
        current.chords.push(...chords);
        current.hasText ||= hasText;
      }
      if (partIndex < parts.length - 1) flush(true, partIndex > 0, section, i + 1);
    });
  });
  flush(false, false, section, lines.length);

  return { marked, bars: finish(drafts) };
}

/** Нумерує такти й підставляє продовжені акорди. */
function finish(drafts: Draft[]): Bar[] {
  const bars: Bar[] = [];
  let previous: string | null = null;
  drafts.forEach((draft, i) => {
    const held = draft.chords.length === 0 && previous !== null;
    const chords = held ? [previous as string] : draft.chords;
    bars.push({ index: i + 1, section: draft.section, line: draft.line, chords, held });
    if (chords.length > 0) previous = chords[chords.length - 1];
  });
  return bars;
}

const SIGNATURE_RE = /^([1-9]\d?)\/(2|4|8|16)$/;

/** Кількість долей у такті за розміром («4/4» це 4, «6/8» це 6). Хибний розмір дає null. */
export function beatsPerBar(signature: string): number | null {
  const match = SIGNATURE_RE.exec(signature);
  return match ? Number(match[1]) : null;
}

export type BarIssue = {
  /** Номер такту, з одиниці */
  bar: number;
  /** Рядок тексту, з одиниці */
  line: number;
  code: 'uneven' | 'no_chord';
  chords: number;
  beats: number;
};

/** Перевіряє, що акорди кожного такту порівну ділять його долі. */
export function validateBars(bars: readonly Bar[], signature: string): BarIssue[] | null {
  const beats = beatsPerBar(signature);
  if (beats === null) return null;

  const issues: BarIssue[] = [];
  for (const bar of bars) {
    if (bar.chords.length === 0) {
      issues.push({ bar: bar.index, line: bar.line, code: 'no_chord', chords: 0, beats });
    } else if (beats % bar.chords.length !== 0) {
      issues.push({ bar: bar.index, line: bar.line, code: 'uneven', chords: bar.chords.length, beats });
    }
  }
  return issues;
}
