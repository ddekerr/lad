import assert from 'node:assert/strict';
import { describe, it } from 'node:test';
import { importOutcome } from './import-outcome';

const item = { index: 1, title: 'A', issues: [] };

describe('importOutcome', () => {
  it('успіх: кількість і ігноровані поля', () => {
    assert.deepEqual(importOutcome(true, { imported: 3, ignoredFields: ['x'] }), {
      kind: 'done',
      imported: 3,
      ignoredFields: ['x'],
    });
  });

  it('успіх без ignoredFields дає порожній список', () => {
    assert.deepEqual(importOutcome(true, { imported: 0 }), { kind: 'done', imported: 0, ignoredFields: [] });
  });

  it('invalid_songs: помилки й загальна кількість', () => {
    assert.deepEqual(importOutcome(false, { error: 'invalid_songs', items: [item], total: 7 }), {
      kind: 'invalid_songs',
      items: [item],
      total: 7,
    });
  });

  it('invalid_songs без total бере довжину списку, без items порожній', () => {
    assert.deepEqual(importOutcome(false, { error: 'invalid_songs', items: [item] }), {
      kind: 'invalid_songs',
      items: [item],
      total: 1,
    });
    assert.deepEqual(importOutcome(false, { error: 'invalid_songs' }), { kind: 'invalid_songs', items: [], total: 0 });
  });

  it('інша помилка сервера передає свій код', () => {
    assert.deepEqual(importOutcome(false, { error: 'too_large' }), { kind: 'error', code: 'too_large' });
  });

  it('немає тіла відповіді або коду: generic', () => {
    assert.deepEqual(importOutcome(false, null), { kind: 'error', code: 'generic' });
    assert.deepEqual(importOutcome(true, {}), { kind: 'error', code: 'generic' });
    assert.deepEqual(importOutcome(true, null), { kind: 'error', code: 'generic' });
  });

  it('res.ok без числа imported, але з помилкою, це помилка', () => {
    assert.deepEqual(importOutcome(true, { error: 'invalid_json' }), { kind: 'error', code: 'invalid_json' });
  });
});
