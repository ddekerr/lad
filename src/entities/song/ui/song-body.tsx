import { Fragment } from 'react';
import { lineChords, lineText, parseSong, transposeChord } from '@/shared/lib/chords';
import { parseSectionMarker, type SectionType } from '@/shared/lib/sections';

export type DisplayMode = 'text' | 'chords' | 'both';

type Props = {
  body: string;
  mode: DisplayMode;
  /** Зсув у півтонах відносно запису в базі */
  shift: number;
  preferFlats: boolean;
  /** Розмір тексту в px; акорди трохи менші */
  textSize?: number;
  /** Назви типів розділів для заголовків, коли в мітці немає підпису */
  sectionNames?: Record<SectionType, string>;
};

/**
 * Малює пісню. У режимі «текст з акордами» акорд стоїть над складом, перед яким
 * його записано: кожен фрагмент це колонка з акордом зверху й текстом знизу.
 */
export function SongBody({ body, mode, shift, preferFlats, textSize = 20, sectionNames }: Props) {
  const lines = parseSong(body);
  const rawLines = body.replace(/\r\n?/g, '\n').split('\n');
  const chordSize = Math.round(textSize * 0.72);
  const move = (chord: string) => transposeChord(chord, shift, preferFlats);

  return (
    <div style={{ fontSize: textSize, lineHeight: 1.25 }} className="flex flex-col gap-3">
      {lines.map((line, i) => {
        const marker = parseSectionMarker(rawLines[i] ?? '');
        if (marker?.kind === 'section') {
          return (
            <div
              key={i}
              role="heading"
              aria-level={3}
              className="mt-2 font-heading font-medium uppercase tracking-wider text-muted"
              style={{ fontSize: Math.round(chordSize * 0.9) }}
            >
              {marker.label || sectionNames?.[marker.type] || marker.type}
            </div>
          );
        }
        if (marker?.kind === 'unknown') {
          return (
            <div key={i} className="whitespace-pre-wrap text-dim" style={{ fontSize: chordSize }}>
              {rawLines[i].trim()}
            </div>
          );
        }

        if (line.length === 0) {
          return <div key={i} aria-hidden="true" style={{ height: textSize * 0.6 }} />;
        }

        if (mode === 'text') {
          return (
            <div key={i} className="whitespace-pre-wrap">
              {lineText(line)}
            </div>
          );
        }

        if (mode === 'chords') {
          const chords = lineChords(line).map(move);
          if (chords.length === 0) return null;
          return (
            <div key={i} className="font-bold text-amber" style={{ fontSize: chordSize + 4, wordSpacing: '0.6em' }}>
              {chords.join(' ')}
            </div>
          );
        }

        return (
          <div key={i} className="flex flex-wrap">
            {line.map((segment, j) => (
              <Fragment key={j}>
                <span className="inline-flex flex-col pr-[0.4em]">
                  <span
                    className="font-bold text-amber"
                    style={{ fontSize: chordSize, lineHeight: 1.3, minHeight: chordSize * 1.3 }}
                  >
                    {segment.chord ? move(segment.chord) : ' '}
                  </span>
                  <span className="whitespace-pre">{segment.text || ' '}</span>
                </span>
              </Fragment>
            ))}
          </div>
        );
      })}
    </div>
  );
}
