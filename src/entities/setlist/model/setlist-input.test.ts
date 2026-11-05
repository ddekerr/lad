import assert from 'node:assert/strict';
import { describe, it } from 'node:test';
import { parseSetlistInput } from './setlist-input';

describe('parseSetlistInput', () => {
  it('приймає назву й пісні, зсув приводить до 0..11', () => {
    const result = parseSetlistInput({
      name: '  Friday gig ',
      items: [{ songId: 'a', keyShift: 14 }, { songId: 'b', keyShift: -1 }, { songId: 'a' }],
    });
    assert.deepEqual(result, {
      ok: true,
      data: {
        name: 'Friday gig',
        items: [
          { songId: 'a', keyShift: 2 },
          { songId: 'b', keyShift: 11 },
          { songId: 'a', keyShift: 0 },
        ],
      },
    });
  });

  it('порожній список дозволено', () => {
    assert.deepEqual(parseSetlistInput({ name: 'x', items: [] }), { ok: true, data: { name: 'x', items: [] } });
  });

  it('відкидає хибне', () => {
    assert.deepEqual(parseSetlistInput(null), { ok: false, error: 'invalid_body' });
    assert.deepEqual(parseSetlistInput({ name: ' ', items: [] }), { ok: false, error: 'invalid_name' });
    assert.deepEqual(parseSetlistInput({ name: 'x' }), { ok: false, error: 'invalid_items' });
    assert.deepEqual(parseSetlistInput({ name: 'x', items: [{ songId: 5 }] }), { ok: false, error: 'invalid_song' });
    assert.deepEqual(parseSetlistInput({ name: 'x', items: [null] }), { ok: false, error: 'invalid_song' });
    assert.deepEqual(parseSetlistInput({ name: 'x', items: [{ songId: 'a', keyShift: 1.5 }] }), {
      ok: false,
      error: 'invalid_key_shift',
    });
  });

  it('обмежує кількість пісень', () => {
    const items = Array.from({ length: 61 }, (_, i) => ({ songId: `s${i}` }));
    assert.deepEqual(parseSetlistInput({ name: 'x', items }), { ok: false, error: 'too_many_items' });
  });
});
