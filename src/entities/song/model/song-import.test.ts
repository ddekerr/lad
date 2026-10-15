import assert from 'node:assert/strict';
import { describe, it } from 'node:test';
import {
  MAX_IMPORT_SONGS,
  MAX_REPORTED_ERRORS,
  parseSongsJson,
  validateImportedSongs,
  type SongImportResult,
} from './song-import';

const song = { title: 'Ти', artist: 'Гурт', language: 'uk', originalKey: 'Am', body: '[Am]Слова [G]тут' };

/** Копія об'єкта без одного поля. */
function without(source: Record<string, unknown>, key: string): Record<string, unknown> {
  return Object.fromEntries(Object.entries(source).filter(([name]) => name !== key));
}

/** Звужує результат до успішного (для зручності перевірок). */
function okResult(result: SongImportResult) {
  assert.ok(result.ok, 'очікували успішний імпорт');
  return result;
}

describe('parseSongsJson', () => {
  it("приймає об'єкт із масивом songs", () => {
    const r = parseSongsJson(JSON.stringify({ songs: [song, song] }));
    assert.ok(r.ok);
    assert.equal(r.items.length, 2);
  });

  it('ігнорує інші ключі верхнього рівня', () => {
    const r = parseSongsJson(JSON.stringify({ format: 'lad', exportedAt: 'today', songs: [song] }));
    assert.ok(r.ok);
    assert.equal(r.items.length, 1);
  });

  it('приймає файл із BOM на початку (Блокнот Windows)', () => {
    const r = parseSongsJson('﻿' + JSON.stringify({ songs: [song] }));
    assert.ok(r.ok);
  });

  it('відхиляє хибний JSON', () => {
    assert.deepEqual(parseSongsJson('{ songs: [ '), { ok: false, error: 'invalid_json' });
    assert.deepEqual(parseSongsJson(''), { ok: false, error: 'invalid_json' });
  });

  it('відхиляє хибну форму документа', () => {
    const bad = { ok: false, error: 'invalid_format' };
    assert.deepEqual(parseSongsJson('[]'), bad);
    assert.deepEqual(parseSongsJson('[{"title":"x"}]'), bad);
    assert.deepEqual(parseSongsJson('null'), bad);
    assert.deepEqual(parseSongsJson('"text"'), bad);
    assert.deepEqual(parseSongsJson('{}'), bad);
    assert.deepEqual(parseSongsJson('{"songs":"x"}'), bad);
    assert.deepEqual(parseSongsJson('{"songs":{"title":"x"}}'), bad);
  });

  it('відхиляє порожній список і занадто довгий', () => {
    assert.deepEqual(parseSongsJson('{"songs":[]}'), { ok: false, error: 'no_songs' });
    const many = JSON.stringify({ songs: Array.from({ length: MAX_IMPORT_SONGS + 1 }, () => song) });
    assert.deepEqual(parseSongsJson(many), { ok: false, error: 'too_many_songs' });
    const limit = JSON.stringify({ songs: Array.from({ length: MAX_IMPORT_SONGS }, () => song) });
    assert.ok(parseSongsJson(limit).ok);
  });
});

describe('validateImportedSongs: зайві поля', () => {
  it("прибирає зайві поля й віддає лише п'ять відомих", () => {
    const r = okResult(
      validateImportedSongs([{ ...song, id: 'abc', version: 5, createdById: 'u1', deletedAt: null, bpm: 120 }]),
    );
    assert.equal(r.songs.length, 1);
    assert.deepEqual(r.songs[0], song);
    assert.deepEqual(Object.keys(r.songs[0]).sort(), ['artist', 'body', 'language', 'originalKey', 'title']);
  });

  it('повідомляє, які поля проігноровано, без повторів', () => {
    const r = okResult(validateImportedSongs([{ ...song, id: '1', bpm: 90 }, { ...song, id: '2' }, song]));
    assert.deepEqual(r.ignoredFields.sort(), ['bpm', 'id']);
  });

  it('без зайвих полів ignoredFields порожній', () => {
    assert.deepEqual(okResult(validateImportedSongs([song])).ignoredFields, []);
  });

  it('не дає записати службові поля: id і version не потрапляють у результат', () => {
    const r = okResult(validateImportedSongs([{ ...song, id: 'hijack', version: 99, createdById: 'someone' }]));
    assert.equal('id' in r.songs[0], false);
    assert.equal('version' in r.songs[0], false);
    assert.equal('createdById' in r.songs[0], false);
  });

  it("__proto__ у файлі не забруднює об'єкти й лише потрапляє в ignoredFields", () => {
    const doc = parseSongsJson(
      '{"songs":[{"__proto__":{"polluted":true},"title":"Ти","artist":"Гурт","language":"uk","originalKey":"Am","body":"[Am]x"}]}',
    );
    assert.ok(doc.ok);
    const r = okResult(validateImportedSongs(doc.items));
    assert.deepEqual(r.ignoredFields, ['__proto__']);
    assert.equal(({} as Record<string, unknown>).polluted, undefined);
    assert.equal(Object.getPrototypeOf(r.songs[0]), Object.prototype);
  });

  it('нормалізує значення так само, як редактор', () => {
    const r = okResult(
      validateImportedSongs([{ ...song, title: '  Ти  ', originalKey: ' Am ', body: '[Am]a\r\n[G]b' }]),
    );
    assert.equal(r.songs[0].title, 'Ти');
    assert.equal(r.songs[0].originalKey, 'Am');
    assert.equal(r.songs[0].body, '[Am]a\n[G]b');
  });
});

describe("validateImportedSongs: обов'язкові поля", () => {
  const fields = ['title', 'artist', 'language', 'originalKey', 'body'] as const;

  for (const field of fields) {
    it(`без поля ${field} це помилка missing`, () => {
      const r = validateImportedSongs([without(song, field)]);
      assert.ok(!r.ok);
      assert.deepEqual(r.items, [
        { index: 1, title: field === 'title' ? null : 'Ти', issues: [{ field, code: 'missing' }] },
      ]);
    });
  }

  it('null рахується відсутнім значенням', () => {
    const r = validateImportedSongs([{ ...song, artist: null }]);
    assert.ok(!r.ok);
    assert.deepEqual(r.items[0].issues, [{ field: 'artist', code: 'missing' }]);
  });

  it('хибне значення це invalid (порожній рядок, невідома мова, невірна тональність, не рядок)', () => {
    const cases: [string, unknown][] = [
      ['title', '   '],
      ['artist', 5],
      ['language', 'de'],
      ['originalKey', 'H#'],
      ['body', '  '],
      ['title', 'x'.repeat(201)],
      ['body', 'x'.repeat(50_001)],
    ];
    for (const [field, value] of cases) {
      const r = validateImportedSongs([{ ...song, [field]: value }]);
      assert.ok(!r.ok, `${field}=${String(value).slice(0, 10)}`);
      assert.deepEqual(r.items[0].issues, [{ field, code: 'invalid' }]);
    }
  });

  it('перелічує всі проблеми однієї пісні, а не лише першу', () => {
    const r = validateImportedSongs([{ title: 'Ти', language: 'de' }]);
    assert.ok(!r.ok);
    assert.deepEqual(r.items[0].issues, [
      { field: 'artist', code: 'missing' },
      { field: 'language', code: 'invalid' },
      { field: 'originalKey', code: 'missing' },
      { field: 'body', code: 'missing' },
    ]);
  });

  it("елемент, що не є об'єктом, це помилка not_an_object", () => {
    for (const item of ['текст', 5, null, [], true]) {
      const r = validateImportedSongs([item]);
      assert.ok(!r.ok);
      assert.deepEqual(r.items, [{ index: 1, title: null, issues: [{ field: null, code: 'not_an_object' }] }]);
    }
  });
});

describe('validateImportedSongs: усе або нічого', () => {
  it('одна погана пісня з трьох: результат це помилка, без жодної збереженої', () => {
    const r = validateImportedSongs([song, { ...song, title: 'Друга', originalKey: 'zzz' }, song]);
    assert.ok(!r.ok);
    assert.equal('songs' in r, false);
    assert.equal(r.total, 1);
    assert.deepEqual(r.items, [{ index: 2, title: 'Друга', issues: [{ field: 'originalKey', code: 'invalid' }] }]);
  });

  it('номери пісень у звіті рахуються з одиниці за позицією у файлі', () => {
    const r = validateImportedSongs([song, song, {}, song, { ...song, body: '' }]);
    assert.ok(!r.ok);
    assert.deepEqual(
      r.items.map((item) => item.index),
      [3, 5],
    );
  });

  it('обрізає довгу назву у звіті', () => {
    const r = validateImportedSongs([{ ...song, title: 'a'.repeat(300), artist: '' }]);
    assert.ok(!r.ok);
    assert.equal(r.items[0].title?.length, 80);
  });

  it('обмежує довжину звіту, але віддає загальну кількість', () => {
    const r = validateImportedSongs(Array.from({ length: MAX_REPORTED_ERRORS + 25 }, () => ({})));
    assert.ok(!r.ok);
    assert.equal(r.items.length, MAX_REPORTED_ERRORS);
    assert.equal(r.total, MAX_REPORTED_ERRORS + 25);
  });

  it('усі пісні гарні: повертає всі в порядку файлу', () => {
    const r = okResult(
      validateImportedSongs([song, { ...song, title: 'Інша' }, { ...song, title: 'Third', language: 'en' }]),
    );
    assert.deepEqual(
      r.songs.map((s) => s.title),
      ['Ти', 'Інша', 'Third'],
    );
  });
});
