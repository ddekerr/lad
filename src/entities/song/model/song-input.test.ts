import assert from 'node:assert/strict';
import { describe, it } from 'node:test';
import { contentChanged, parseSongInput } from './song-input';

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

describe('contentChanged', () => {
  const a = { title: 'A', artist: 'B', language: 'en' as const, originalKey: 'C', body: 'x' };
  it('false для однакових, true для будь-якої зміни', () => {
    assert.equal(contentChanged(a, { ...a }), false);
    assert.equal(contentChanged(a, { ...a, body: 'y' }), true);
    assert.equal(contentChanged(a, { ...a, originalKey: 'D' }), true);
  });
});
