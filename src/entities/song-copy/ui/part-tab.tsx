import { BASS_STRINGS, type PartTabModel, type TabBar } from '../model/part-tab';

type Props = {
  tab: PartTabModel;
  /** Базовий розмір у пікселях: від нього залежать лади, відстані й довжина такту */
  size?: number;
  /** Підпис розділу за його ідентифікатором */
  sectionLabel?: (id: string) => string;
  /** Підпис для скрінрідера */
  label: string;
};

/**
 * Табулатура баса: чотири лінії (G D A E зверху вниз), номери ладів у місці долі,
 * акорди над тактом, під лініями смужки тривалості нот і позначки долей.
 * Кожен такт це окремий SVG, тому рядки переносяться самі за шириною контейнера.
 */
export function PartTab({ tab, size = 20, sectionLabel, label }: Props) {
  return (
    <div role="img" aria-label={label} className="flex flex-wrap items-end gap-y-3">
      {tab.bars.map((bar) => (
        <div key={bar.bar} className="contents">
          {bar.sectionStart && bar.section && (
            <div
              className="w-full pt-2 font-heading font-bold uppercase tracking-wide text-taupe"
              style={{ fontSize: Math.max(12, Math.round(size * 0.7)) }}
            >
              {sectionLabel ? sectionLabel(bar.section) : bar.section}
            </div>
          )}
          <BarTab bar={bar} beats={tab.beats} size={size} />
        </div>
      ))}
    </div>
  );
}

function BarTab({ bar, beats, size }: { bar: TabBar; beats: number; size: number }) {
  const beatW = size * 1.6;
  const pad = size * 0.5;
  const width = beats * beatW + pad * 2;
  const gap = size * 1.1;
  const chordRow = size * 1.3;
  const top = chordRow + size * 0.4;
  const lineY = (index: number) => top + index * gap;
  const bottom = lineY(BASS_STRINGS.length - 1);
  const rhythmY = bottom + size * 0.55;
  const height = rhythmY + size * 0.5;
  const xOf = (beat: number) => pad + (beat - 1) * beatW;
  const stroke = Math.max(1, size / 14);

  return (
    <svg
      width={width}
      height={height}
      viewBox={`0 0 ${width} ${height}`}
      aria-hidden="true"
      className="-ml-px flex-none overflow-visible"
    >
      {BASS_STRINGS.map((string, i) => (
        <line
          key={string.name}
          x1={0}
          x2={width}
          y1={lineY(i)}
          y2={lineY(i)}
          className="stroke-taupe"
          strokeWidth={stroke}
        />
      ))}
      <line x1={0} x2={0} y1={lineY(0)} y2={bottom} className="stroke-cream" strokeWidth={stroke * 1.5} />
      <line x1={width} x2={width} y1={lineY(0)} y2={bottom} className="stroke-cream" strokeWidth={stroke * 1.5} />

      <text x={size * 0.15} y={size * 0.95} className="fill-dim" fontSize={size * 0.6}>
        {bar.bar}
      </text>
      {bar.chords.map((chord, i) => (
        <text
          key={i}
          x={xOf(chord.beat)}
          y={chordRow}
          className="fill-amber font-bold"
          fontSize={size * 0.95}
          style={{ fontFamily: 'var(--font-heading), sans-serif' }}
        >
          {chord.name}
        </text>
      ))}

      {/* позначки долей */}
      {Array.from({ length: beats }, (_, i) => (
        <line
          key={i}
          x1={xOf(i + 1)}
          x2={xOf(i + 1)}
          y1={rhythmY - size * 0.12}
          y2={rhythmY + size * 0.12}
          className="stroke-line"
          strokeWidth={stroke}
        />
      ))}

      {bar.notes.map((note, i) => {
        const x = xOf(note.beat);
        const y = lineY(note.string);
        const text = String(note.fret);
        const boxW = size * 0.62 * text.length + size * 0.3;
        return (
          <g key={i}>
            <rect x={x - boxW / 2} y={y - size * 0.5} width={boxW} height={size} className="fill-ink" />
            <text
              x={x}
              y={y + size * 0.36}
              textAnchor="middle"
              className="fill-cream font-bold"
              fontSize={size * 1.0}
              style={{ fontFamily: 'var(--font-heading), sans-serif' }}
            >
              {text}
            </text>
            <rect
              x={x}
              y={rhythmY - stroke * 1.5}
              width={Math.max(stroke * 2, note.length * beatW - size * 0.12)}
              height={stroke * 3}
              rx={stroke * 1.5}
              className="fill-muted"
            />
          </g>
        );
      })}
    </svg>
  );
}
