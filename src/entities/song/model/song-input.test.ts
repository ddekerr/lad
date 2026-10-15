import assert from 'node:assert/strict';
import { describe, it } from 'node:test';
import { contentChanged, parseFields, parseSongInput, type FieldSpecs } from './song-input';

const valid = { title: ' Ти ', artist: 'Гурт', language: 'uk', originalKey: 'Am', body: '[Am]Слова\r\n[G]тут' };

describe('parseSongInput', () => {
  it('тримає пробіли й нормалізує переноси рядків', () => {
    const r = parseSongInput(valid);
    assert.ok(r.ok);
    assert.equal(r.data.title, 'Ти');
    assert.equal(r.data.body, '[Am]Слова\n[G]тут');
  });
  it('відхиляє погані поля', () => {
    assert.deepEqual(parseSongInput(null), { ok: false, error: 'invalid_body' });
    assert.deepEqual(parseSongInput({ ...valid, title: ' ' }), { ok: false, error: 'invalid_title' });
    assert.deepEqual(parseSongInput({ ...valid, artist: '' }), { ok: false, error: 'invalid_artist' });
    assert.deepEqual(parseSongInput({ ...valid, language: 'de' }), { ok: false, error: 'invalid_language' });
    assert.deepEqual(parseSongInput({ ...valid, originalKey: 'H#' }), { ok: false, error: 'invalid_key' });
    assert.deepEqual(parseSongInput({ ...valid, body: '  ' }), { ok: false, error: 'invalid_body' });
  });
});

describe('parseSongInput: відсутні й порожні поля', () => {
  it("відсутнє обов'язкове поле дає ту саму помилку, що й хибне", () => {
    const withoutTitle = Object.fromEntries(Object.entries(valid).filter(([name]) => name !== 'title'));
    assert.deepEqual(parseSongInput(withoutTitle), { ok: false, error: 'invalid_title' });
    assert.deepEqual(parseSongInput({ ...valid, language: null }), { ok: false, error: 'invalid_language' });
    assert.deepEqual(parseSongInput([]), { ok: false, error: 'invalid_title' });
  });
  it('повертає першу помилку в порядку полів', () => {
    assert.deepEqual(parseSongInput({ language: 'de', body: '' }), { ok: false, error: 'invalid_title' });
    assert.deepEqual(parseSongInput({ ...valid, language: 'de', body: '' }), { ok: false, error: 'invalid_language' });
  });
  it('віддає лише відомі поля', () => {
    const r = parseSongInput({ ...valid, id: 'x', version: 9, deletedAt: 'now' });
    assert.ok(r.ok);
    assert.deepEqual(Object.keys(r.data).sort(), ['artist', 'body', 'language', 'originalKey', 'title']);
  });
});

describe('parseFields', () => {
  type Demo = { name: string; nick: string; age?: number };
  const specs: FieldSpecs<Demo> = {
    name: { required: true, parse: (v) => (typeof v === 'string' && v.trim() ? v.trim() : null) },
    nick: { required: false, defaultValue: 'anon', parse: (v) => (typeof v === 'string' ? v : null) },
    age: { required: false, parse: (v) => (typeof v === 'number' ? v : null) },
  };

  it("необов'язкове поле: підставляє значення за замовчуванням або просто пропускає", () => {
    assert.deepEqual(parseFields(specs, { name: ' Ann ' }), { ok: true, data: { name: 'Ann', nick: 'anon' } });
  });
  it("необов'язкове поле зі значенням перевіряється: хибне значення це помилка", () => {
    assert.deepEqual(parseFields(specs, { name: 'Ann', age: 7, nick: 'a' }), {
      ok: true,
      data: { name: 'Ann', nick: 'a', age: 7 },
    });
    assert.deepEqual(parseFields(specs, { name: 'Ann', age: 'old' }), {
      ok: false,
      issues: [{ field: 'age', code: 'invalid' }],
    });
  });
  it("обов'язкове поле: відсутнє або null це missing, хибне це invalid", () => {
    assert.deepEqual(parseFields(specs, {}), { ok: false, issues: [{ field: 'name', code: 'missing' }] });
    assert.deepEqual(parseFields(specs, { name: null }), { ok: false, issues: [{ field: 'name', code: 'missing' }] });
    assert.deepEqual(parseFields(specs, { name: '  ' }), { ok: false, issues: [{ field: 'name', code: 'invalid' }] });
  });
  it('зайві поля відкидає', () => {
    const r = parseFields(specs, { name: 'Ann', id: 5, extra: true });
    assert.deepEqual(r, { ok: true, data: { name: 'Ann', nick: 'anon' } });
  });
  it('не бере успадковані властивості', () => {
    const inherited = Object.create({ name: 'Ann' }) as Record<string, unknown>;
    assert.deepEqual(parseFields(specs, inherited), { ok: false, issues: [{ field: 'name', code: 'missing' }] });
  });
});

describe('contentChanged', () => {
  const a = { title: 'A', artist: 'B', language: 'en' as const, originalKey: 'C', body: 'x' };
  it('false для однакових, true для будь-якої зміни', () => {
    assert.equal(contentChanged(a, { ...a }), false);
    assert.equal(contentChanged(a, { ...a, body: 'y' }), true);
    assert.equal(contentChanged(a, { ...a, originalKey: 'D' }), true);
  });
});
