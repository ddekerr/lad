'use client';

import { useRouter } from 'next/navigation';
import { useState } from 'react';
import {
  MAX_BPM,
  MAX_DYNAMICS,
  MIN_BPM,
  MIN_DYNAMICS,
  missingParameters,
  TIME_SIGNATURES,
  type SectionDynamics,
} from '@/entities/song-copy';
import { fmt, type Dictionary } from '@/shared/i18n';
import { parseBars, validateBars, type BarIssue } from '@/shared/lib/bars';
import { IMPLICIT_SECTION_ID, listSections } from '@/shared/lib/sections';

type Props = {
  copyId: string;
  body: string;
  initial: { bpm: number | null; timeSignature: string | null; sectionDynamics: SectionDynamics };
  t: Dictionary;
};

const field = 'min-h-11 rounded-tile bg-ink px-4 text-cream';
const LEVELS = Array.from({ length: MAX_DYNAMICS - MIN_DYNAMICS + 1 }, (_, i) => MIN_DYNAMICS + i);

/**
 * Параметри для генерації партій: темп, розмір і динаміка кожного розділу.
 * Нічого не обов'язково заповнювати, але без них партія не згенерується: нижче видно, чого бракує.
 */
export function CopyParameters({ copyId, body, initial, t }: Props) {
  const router = useRouter();
  const [bpm, setBpm] = useState(initial.bpm === null ? '' : String(initial.bpm));
  const [signature, setSignature] = useState(initial.timeSignature ?? '');
  const [dynamics, setDynamics] = useState<SectionDynamics>(initial.sectionDynamics);
  const [status, setStatus] = useState<'idle' | 'saved' | 'error' | 'invalid_bpm'>('idle');

  const sections = listSections(body);
  const bpmNumber = bpm.trim() === '' ? null : Number(bpm);
  const bpmValid = bpmNumber === null || (Number.isInteger(bpmNumber) && bpmNumber >= MIN_BPM && bpmNumber <= MAX_BPM);

  const missing = missingParameters({
    body,
    bpm: bpmValid ? bpmNumber : null,
    timeSignature: signature || null,
    sectionDynamics: dynamics,
  });

  const sectionName = (section: (typeof sections)[number]) =>
    section.id === IMPLICIT_SECTION_ID
      ? t.parameters.wholeSong
      : section.label || (section.type === 'main' ? '' : t.sections.names[section.type]);
  const nameById = new Map(sections.map((s) => [s.id, sectionName(s)]));

  function setLevel(id: string, value: string) {
    setDynamics((current) => {
      const next = { ...current };
      if (value === '') delete next[id];
      else next[id] = Number(value);
      return next;
    });
    setStatus('idle');
  }

  async function save() {
    if (!bpmValid) return setStatus('invalid_bpm');
    const res = await fetch(`/api/copies/${copyId}`, {
      method: 'PATCH',
      headers: { 'content-type': 'application/json' },
      body: JSON.stringify({ bpm: bpmNumber, timeSignature: signature || null, sectionDynamics: dynamics }),
    }).catch(() => null);
    setStatus(res?.ok ? 'saved' : 'error');
    if (res?.ok) router.refresh();
  }

  const { marked, bars } = parseBars(body);
  const barIssues = signature ? (validateBars(bars, signature) ?? []) : null;
  const MAX_SHOWN_ISSUES = 8;
  const issueText = (issue: BarIssue) =>
    fmt(issue.code === 'uneven' ? t.bars.uneven : t.bars.noChord, {
      bar: issue.bar,
      line: issue.line,
      chords: issue.chords,
      beats: issue.beats,
    });

  const missingList = [
    missing.bpm && t.parameters.bpm,
    missing.timeSignature && t.parameters.timeSignature,
    missing.sections.length > 0 &&
      fmt(t.parameters.missingDynamics, { sections: missing.sections.map((id) => nameById.get(id) ?? id).join(', ') }),
    barIssues && barIssues.length > 0 && fmt(t.bars.problemsCount, { count: barIssues.length }),
  ].filter(Boolean);

  return (
    <section aria-labelledby="parameters-title" className="flex flex-col gap-4 rounded-card bg-surface p-5 sm:p-8">
      <div>
        <h2 id="parameters-title" className="font-heading text-lg font-bold">
          {t.parameters.title}
        </h2>
        <p className="text-sm text-muted">{t.parameters.intro}</p>
      </div>

      <div className="grid gap-4 sm:grid-cols-2">
        <label className="flex flex-col gap-1.5">
          <span className="text-sm text-muted">{t.parameters.bpm}</span>
          <input
            type="number"
            inputMode="numeric"
            min={MIN_BPM}
            max={MAX_BPM}
            value={bpm}
            onChange={(e) => {
              setBpm(e.target.value);
              setStatus('idle');
            }}
            className={field}
          />
          <span className="text-xs text-muted">{fmt(t.parameters.bpmHint, { min: MIN_BPM, max: MAX_BPM })}</span>
        </label>
        <label className="flex flex-col gap-1.5">
          <span className="text-sm text-muted">{t.parameters.timeSignature}</span>
          <select
            value={signature}
            onChange={(e) => {
              setSignature(e.target.value);
              setStatus('idle');
            }}
            className={field}
          >
            <option value="">{t.parameters.notSet}</option>
            {TIME_SIGNATURES.map((value) => (
              <option key={value} value={value}>
                {value}
              </option>
            ))}
          </select>
          <span className="text-xs text-muted">{t.parameters.timeSignatureHint}</span>
        </label>
      </div>

      <div className="flex flex-col gap-1 text-sm">
        <p className="text-muted">
          {bars.length === 0 ? t.bars.noBars : fmt(marked ? t.bars.marked : t.bars.unmarked, { count: bars.length })}
        </p>
        {barIssues === null && bars.length > 0 && <p className="text-muted">{t.bars.pickSignature}</p>}
        {barIssues !== null && barIssues.length === 0 && bars.length > 0 && (
          <p className="text-success">{t.bars.allFine}</p>
        )}
        {barIssues !== null && barIssues.length > 0 && (
          <ul role="alert" className="flex flex-col gap-1 text-danger">
            {barIssues.slice(0, MAX_SHOWN_ISSUES).map((issue) => (
              <li key={issue.bar}>{issueText(issue)}</li>
            ))}
            {barIssues.length > MAX_SHOWN_ISSUES && (
              <li>{fmt(t.bars.more, { count: barIssues.length - MAX_SHOWN_ISSUES })}</li>
            )}
          </ul>
        )}
      </div>

      <div className="flex flex-col gap-2">
        <div className="font-semibold">{t.parameters.dynamics}</div>
        <p className="text-xs text-muted">{t.parameters.dynamicsHint}</p>
        {sections.length === 0 ? (
          <p className="text-sm text-muted">{t.parameters.noSections}</p>
        ) : (
          <ul className="flex flex-col gap-2">
            {sections.map((section) => (
              <li key={section.id} className="flex items-center justify-between gap-3">
                <label htmlFor={`dyn-${section.id}`} className="min-w-0 truncate">
                  {sectionName(section)}
                </label>
                <select
                  id={`dyn-${section.id}`}
                  value={dynamics[section.id] ?? ''}
                  onChange={(e) => setLevel(section.id, e.target.value)}
                  className={`${field} w-28`}
                >
                  <option value="">{t.parameters.notSet}</option>
                  {LEVELS.map((level) => (
                    <option key={level} value={level}>
                      {level}
                    </option>
                  ))}
                </select>
              </li>
            ))}
          </ul>
        )}
      </div>

      <p role="status" className={'text-sm ' + (missingList.length === 0 ? 'text-success' : 'text-muted')}>
        {missingList.length === 0 ? t.parameters.allSet : fmt(t.parameters.missing, { list: missingList.join('; ') })}
      </p>

      <div className="flex flex-wrap items-center gap-3">
        <button
          type="button"
          onClick={save}
          className="min-h-11 rounded-tile bg-amber px-6 font-semibold text-ink hover:bg-amber-active"
        >
          {t.parameters.save}
        </button>
        <p aria-live="polite" className="text-sm">
          {status === 'saved' && <span className="text-success">{t.copy.saved}</span>}
          {status === 'error' && <span className="text-danger">{t.copy.failed}</span>}
          {status === 'invalid_bpm' && (
            <span className="text-danger">{fmt(t.parameters.bpmHint, { min: MIN_BPM, max: MAX_BPM })}</span>
          )}
        </p>
      </div>
    </section>
  );
}
