import { Fragment } from "react";
import { lineChords, lineText, parseSong, transposeChord } from "@/shared/lib/chords";

export type DisplayMode = "text" | "chords" | "both";

type Props = {
  body: string;
  mode: DisplayMode;
  /** Зсув у півтонах відносно запису в базі */
  shift: number;
  preferFlats: boolean;
  /** Розмір тексту в px; акорди трохи менші */
  textSize?: number;
};

/**
 * Малює пісню. У режимі «текст з акордами» акорд стоїть над складом, перед яким
 * його записано: кожен фрагмент це колонка з акордом зверху й текстом знизу.
 */
export function SongBody({ body, mode, shift, preferFlats, textSize = 20 }: Props) {
  const lines = parseSong(body);
  const chordSize = Math.round(textSize * 0.72);
  const move = (chord: string) => transposeChord(chord, shift, preferFlats);

  return (
    <div style={{ fontSize: textSize, lineHeight: 1.25 }} className="flex flex-col gap-3">
      {lines.map((line, i) => {
        if (line.length === 0) {
          return <div key={i} aria-hidden="true" style={{ height: textSize * 0.6 }} />;
        }

        if (mode === "text") {
          return (
            <div key={i} className="whitespace-pre-wrap">
              {lineText(line)}
            </div>
          );
        }

        if (mode === "chords") {
          const chords = lineChords(line).map(move);
          if (chords.length === 0) return null;
          return (
            <div
              key={i}
              className="font-bold text-amber"
              style={{ fontSize: chordSize + 4, wordSpacing: "0.6em" }}
            >
              {chords.join(" ")}
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
                    {segment.chord ? move(segment.chord) : " "}
                  </span>
                  <span className="whitespace-pre">{segment.text || " "}</span>
                </span>
              </Fragment>
            ))}
          </div>
        );
      })}
    </div>
  );
}
