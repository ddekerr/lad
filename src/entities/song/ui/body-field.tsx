'use client';

import { useEffect, useId, useRef } from 'react';
import { fmt, type Dictionary } from '@/shared/i18n';
import {
  findSectionIssues,
  formatSectionMarker,
  insertSectionMarker,
  nextSectionLabel,
  SECTION_TYPES,
  type SectionType,
} from '@/shared/lib/sections';

type Props = {
  label: string;
  /** Підказка під полем про запис акордів */
  hint: string;
  value: string;
  onChange: (value: string) => void;
  rows?: number;
  t: Dictionary;
};

/**
 * Поле тексту пісні з акордами й кнопками розділів. Кнопка вставляє мітку розділу
 * окремим рядком перед рядком, де стоїть курсор. Мітки з невідомим типом підсвічуються.
 */
export function BodyField({ label, hint, value, onChange, rows = 18, t }: Props) {
  const id = useId();
  const area = useRef<HTMLTextAreaElement>(null);
  const pendingCursor = useRef<number | null>(null);
  const issues = findSectionIssues(value);

  // Курсор ставимо після оновлення тексту: до того в полі ще старе значення.
  useEffect(() => {
    const el = area.current;
    if (pendingCursor.current === null || !el) return;
    el.focus();
    el.setSelectionRange(pendingCursor.current, pendingCursor.current);
    pendingCursor.current = null;
  }, [value]);

  function insert(type: SectionType) {
    const cursor = area.current?.selectionStart ?? value.length;
    const marker = formatSectionMarker(type, nextSectionLabel(value, type, t.sections.names[type]));
    const result = insertSectionMarker(value, cursor, marker);
    pendingCursor.current = result.cursor;
    onChange(result.body);
  }

  return (
    <div className="flex flex-col gap-1.5">
      <label htmlFor={id} className="text-sm text-muted">
        {label}
      </label>
      <div role="group" aria-label={t.sections.toolbar} className="flex flex-wrap items-center gap-2">
        <span className="text-xs text-muted">{t.sections.toolbar}:</span>
        {SECTION_TYPES.map((type) => (
          <button
            key={type}
            type="button"
            title={t.sections.insert}
            onClick={() => insert(type)}
            className="min-h-9 rounded-tile bg-line px-3 text-sm font-semibold text-cream hover:bg-taupe hover:text-ink"
          >
            {t.sections.names[type]}
          </button>
        ))}
      </div>
      <textarea
        id={id}
        ref={area}
        value={value}
        onChange={(e) => onChange(e.target.value)}
        rows={rows}
        spellCheck={false}
        className="rounded-tile bg-ink p-4 font-mono text-sm"
      />
      <span className="text-xs text-muted">{hint}</span>
      <span className="text-xs text-muted">{t.sections.hint}</span>
      <span className="text-xs text-muted">{t.bars.hint}</span>
      {issues.length > 0 && (
        <ul role="alert" className="flex flex-col gap-1 text-sm text-danger">
          {issues.map((issue) => (
            <li key={issue.line}>{fmt(t.sections.unknown, { line: issue.line + 1, text: issue.text })}</li>
          ))}
        </ul>
      )}
    </div>
  );
}
