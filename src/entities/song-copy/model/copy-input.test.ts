import assert from 'node:assert/strict';
import { describe, it } from 'node:test';
import { parseCopyPatch } from './copy-input';

describe('введення копій', () => {
  it('PATCH копії: нормалізує зсув і обрізає пробіли', () => {
    assert.deepEqual(parseCopyPatch({ keyShift: 14, title: '  T ' }), {
      ok: true,
      data: { keyShift: 2, title: 'T' },
    });
    assert.deepEqual(parseCopyPatch({ keyShift: -1 }), { ok: true, data: { keyShift: 11 } });
  });

  it('PATCH копії: відхиляє хибні значення й порожній запит', () => {
    assert.deepEqual(parseCopyPatch({ keyShift: 1.5 }), { ok: false, error: 'invalid_key_shift' });
    assert.deepEqual(parseCopyPatch({ title: '' }), { ok: false, error: 'invalid_title' });
    assert.deepEqual(parseCopyPatch({ notes: 'x'.repeat(5001) }), { ok: false, error: 'invalid_notes' });
    assert.deepEqual(parseCopyPatch({ body: 1 }), { ok: false, error: 'invalid_body' });
    assert.deepEqual(parseCopyPatch({}), { ok: false, error: 'empty_patch' });
    assert.deepEqual(parseCopyPatch(null), { ok: false, error: 'invalid_body' });
  });

  it('PATCH копії ігнорує сторонні поля (захист від масового присвоєння)', () => {
    assert.deepEqual(parseCopyPatch({ notes: 'n', playlistId: 'x', sourceSongId: 'y' }), {
      ok: true,
      data: { notes: 'n' },
    });
  });
});
