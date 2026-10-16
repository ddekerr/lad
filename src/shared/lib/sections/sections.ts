/**
 * Розділи пісні (куплет, приспів, бридж) задаються мітками прямо в тексті з акордами:
 * окремий рядок у фігурних дужках, `{verse: Куплет 1}` чи `{chorus}`. Розділ триває до наступної мітки.
 * Мітки лежать у тому самому полі, що й акорди, тож їх несуть із собою копії, версії й імпорт.
 */

export const SECTION_TYPES = ['intro', 'verse', 'pre-chorus', 'chorus', 'bridge', 'solo', 'outro'] as const;
export type SectionType = (typeof SECTION_TYPES)[number];

/** Розділ без мітки: усе, що стоїть до першої мітки, і пісні зовсім без міток. */
export const IMPLICIT_SECTION_ID = 'main';

const MARKER_RE = /^\s*\{\s*([^}:]*?)\s*(?::\s*([^}]*?))?\s*\}\s*$/;

export type SectionMarker = { kind: 'section'; type: SectionType; label: string } | { kind: 'unknown'; name: string };

function isSectionType(value: string): value is SectionType {
  return (SECTION_TYPES as readonly string[]).includes(value);
}

/** Розбирає один рядок як мітку розділу. null: це звичайний рядок пісні. */
export function parseSectionMarker(line: string): SectionMarker | null {
  const match = MARKER_RE.exec(line);
  if (!match) return null;
  const name = match[1].toLowerCase();
  if (!isSectionType(name)) return { kind: 'unknown', name: match[1] };
  return { kind: 'section', type: name, label: (match[2] ?? '').trim() };
}

/** Ідентифікатор розділу: назва без регістру, а без назви тип. Однакові назви це один розділ (приспів, що повторюється). */
export function sectionId(marker: { type: SectionType; label: string }): string {
  return (marker.label || marker.type).toLowerCase();
}

export type SongSection = { id: string; type: SectionType | 'main'; label: string; line: number };

/**
 * Список розділів пісні в порядку появи, без повторів за ідентифікатором. Рядки з 0.
 * Пісня без міток (чи з текстом перед першою міткою) має неявний розділ `main`.
 */
export function listSections(body: string): SongSection[] {
  const result: SongSection[] = [];
  const seen = new Set<string>();
  const add = (section: SongSection) => {
    if (seen.has(section.id)) return;
    seen.add(section.id);
    result.push(section);
  };

  body
    .replace(/\r\n?/g, '\n')
    .split('\n')
    .forEach((raw, line) => {
      const marker = parseSectionMarker(raw);
      if (marker?.kind === 'section') {
        add({ id: sectionId(marker), type: marker.type, label: marker.label, line });
      } else if (!marker && raw.trim() && result.length === 0) {
        add({ id: IMPLICIT_SECTION_ID, type: 'main', label: '', line });
      }
    });

  return result;
}

export type SectionIssue = { line: number; text: string };

/** Мітки у фігурних дужках з невідомим типом. Рядки з 0. */
export function findSectionIssues(body: string): SectionIssue[] {
  const issues: SectionIssue[] = [];
  body
    .replace(/\r\n?/g, '\n')
    .split('\n')
    .forEach((raw, line) => {
      if (parseSectionMarker(raw)?.kind === 'unknown') issues.push({ line, text: raw.trim() });
    });
  return issues;
}

/** Підпис нового розділу: куплети нумеруються («Куплет 3»), решта без підпису, щоб повтори ділили одну назву. */
export function nextSectionLabel(body: string, type: SectionType, typeName: string): string {
  if (type !== 'verse') return '';
  const used = body
    .replace(/\r\n?/g, '\n')
    .split('\n')
    .filter((raw) => {
      const marker = parseSectionMarker(raw);
      return marker?.kind === 'section' && marker.type === 'verse';
    }).length;
  return `${typeName} ${used + 1}`;
}

export function formatSectionMarker(type: SectionType, label: string): string {
  return label ? `{${type}: ${label}}` : `{${type}}`;
}

/**
 * Вставляє мітку окремим рядком перед рядком, де стоїть курсор. Повертає новий текст
 * і позицію курсора після мітки (на початку наступного рядка).
 */
export function insertSectionMarker(body: string, cursor: number, marker: string): { body: string; cursor: number } {
  const position = Math.min(Math.max(cursor, 0), body.length);
  const lineStart = position === 0 ? 0 : body.lastIndexOf('\n', position - 1) + 1;
  const insertion = `${marker}\n`;
  return { body: body.slice(0, lineStart) + insertion + body.slice(lineStart), cursor: lineStart + insertion.length };
}
