/**
 * Розбір тексту з акордами у стилі ChordPro: `[Am]Слова [G]тут`.
 * Акорд стоїть у квадратних дужках прямо перед складом, де він змінюється.
 */

export type Segment = {
  /** Акорд над цим фрагментом тексту; null, якщо акорда немає */
  chord: string | null;
  text: string;
};

export type Line = Segment[];

const CHORD_RE = /\[([^\]]+)\]/g;

/** Розбирає один рядок на фрагменти. Порожній рядок дає порожній масив. */
export function parseLine(raw: string): Line {
  const segments: Line = [];
  let last = 0;
  let pending: string | null = null;

  for (const match of raw.matchAll(CHORD_RE)) {
    const index = match.index ?? 0;
    const text = raw.slice(last, index);
    if (text !== "" || pending !== null) {
      segments.push({ chord: pending, text });
    }
    pending = match[1].trim();
    last = index + match[0].length;
  }

  const tail = raw.slice(last);
  if (tail !== "" || pending !== null) {
    segments.push({ chord: pending, text: tail });
  }
  return segments;
}

/** Розбирає всю пісню на рядки. Порожні рядки зберігаються як відступи. */
export function parseSong(body: string): Line[] {
  return body.replace(/\r\n?/g, "\n").split("\n").map(parseLine);
}

/** Лише текст рядка, без акордів. */
export function lineText(line: Line): string {
  return line.map((s) => s.text).join("");
}

/** Лише акорди рядка у порядку появи. */
export function lineChords(line: Line): string[] {
  return line.flatMap((s) => (s.chord ? [s.chord] : []));
}
