import assert from 'node:assert/strict';
import { describe, it } from 'node:test';
import {
  findSectionIssues,
  formatSectionMarker,
  insertSectionMarker,
  listSections,
  nextSectionLabel,
  parseSectionMarker,
  sectionId,
} from './index';

describe('parseSectionMarker', () => {
  it('розбирає тип без підпису й з підписом', () => {
    assert.deepEqual(parseSectionMarker('{chorus}'), { kind: 'section', type: 'chorus', label: '' });
    assert.deepEqual(parseSectionMarker('{verse: Куплет 1}'), { kind: 'section', type: 'verse', label: 'Куплет 1' });
  });

  it('терпить пробіли й регістр типу', () => {
    assert.deepEqual(parseSectionMarker('  {  Bridge :  Місток  }  '), {
      kind: 'section',
      type: 'bridge',
      label: 'Місток',
    });
  });

  it('невідомий тип у дужках це unknown', () => {
    assert.deepEqual(parseSectionMarker('{refrain}'), { kind: 'unknown', name: 'refrain' });
  });

  it('звичайні рядки не є мітками', () => {
    assert.equal(parseSectionMarker('[Am]Слова [G]тут'), null);
    assert.equal(parseSectionMarker('Текст {у дужках} в середині'), null);
    assert.equal(parseSectionMarker(''), null);
  });
});

describe('sectionId', () => {
  it('підпис, а без нього тип, без регістру', () => {
    assert.equal(sectionId({ type: 'verse', label: 'Куплет 1' }), 'куплет 1');
    assert.equal(sectionId({ type: 'chorus', label: '' }), 'chorus');
  });
});

describe('listSections', () => {
  it('пісня без міток має неявний розділ main', () => {
    assert.deepEqual(listSections('[Am]Слова\n[G]ще'), [{ id: 'main', type: 'main', label: '', line: 0 }]);
  });

  it('порожній текст не має розділів', () => {
    assert.deepEqual(listSections('  \n'), []);
  });

  it('збирає розділи в порядку появи, повтори зливає', () => {
    const body = [
      '{verse: Куплет 1}',
      '[Am]a',
      '{chorus}',
      '[G]b',
      '{verse: Куплет 2}',
      '[Am]c',
      '{chorus}',
      '[G]d',
    ].join('\n');
    assert.deepEqual(
      listSections(body).map((s) => [s.id, s.line]),
      [
        ['куплет 1', 0],
        ['chorus', 2],
        ['куплет 2', 4],
      ],
    );
  });

  it('текст перед першою міткою дає розділ main', () => {
    const ids = listSections('[Am]вступ\n{verse}\n[G]x').map((s) => s.id);
    assert.deepEqual(ids, ['main', 'verse']);
  });

  it('невідомі мітки не стають розділами', () => {
    assert.deepEqual(
      listSections('{refrain}\n[Am]x').map((s) => s.id),
      ['main'],
    );
  });

  it('приймає перенос рядків Windows', () => {
    assert.deepEqual(
      listSections('{verse}\r\n[Am]x').map((s) => s.id),
      ['verse'],
    );
  });
});

describe('findSectionIssues', () => {
  it('знаходить лише мітки з невідомим типом', () => {
    const body = '{verse}\n{refrain: Приспів}\n[Am]x';
    assert.deepEqual(findSectionIssues(body), [{ line: 1, text: '{refrain: Приспів}' }]);
  });
});

describe('nextSectionLabel і formatSectionMarker', () => {
  it('нумерує куплети', () => {
    assert.equal(nextSectionLabel('', 'verse', 'Куплет'), 'Куплет 1');
    assert.equal(nextSectionLabel('{verse: Куплет 1}\n[Am]x\n{chorus}\n{verse}', 'verse', 'Куплет'), 'Куплет 3');
  });

  it('інші типи без підпису', () => {
    assert.equal(nextSectionLabel('{chorus}', 'chorus', 'Приспів'), '');
  });

  it('форматує мітку', () => {
    assert.equal(formatSectionMarker('verse', 'Куплет 1'), '{verse: Куплет 1}');
    assert.equal(formatSectionMarker('chorus', ''), '{chorus}');
  });
});

describe('insertSectionMarker', () => {
  it('вставляє перед рядком із курсором', () => {
    const result = insertSectionMarker('[Am]a\n[G]b', 8, '{chorus}');
    assert.equal(result.body, '[Am]a\n{chorus}\n[G]b');
    assert.equal(result.cursor, 15);
  });

  it('на початку тексту', () => {
    assert.deepEqual(insertSectionMarker('[Am]a', 0, '{verse}'), { body: '{verse}\n[Am]a', cursor: 8 });
  });

  it('у порожньому тексті й за межами', () => {
    assert.deepEqual(insertSectionMarker('', 5, '{verse}'), { body: '{verse}\n', cursor: 8 });
    assert.deepEqual(insertSectionMarker('ab', -3, '{x}'), { body: '{x}\nab', cursor: 4 });
  });

  it('курсор на початку, коли перший рядок порожній', () => {
    assert.equal(insertSectionMarker('\nx', 0, '{m}').body, '{m}\n\nx');
  });

  it('курсор у кінці рядка вставляє перед цим рядком', () => {
    assert.equal(insertSectionMarker('a\nb', 1, '{m}').body, '{m}\na\nb');
  });
});
