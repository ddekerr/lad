import assert from 'node:assert/strict';
import { describe, it } from 'node:test';
import { normalizeSearch, songSearchKey } from './song-search';

describe('normalizeSearch', () => {
  it('прибирає зайві пробіли й зводить до малих літер, зокрема кирилицю', () => {
    assert.equal(normalizeSearch('  Привіт   СВІТ '), 'привіт світ');
    assert.equal(normalizeSearch('Slash AND Flat'), 'slash and flat');
  });
});

describe('songSearchKey', () => {
  it('складається з назви й виконавця', () => {
    assert.equal(songSearchKey({ title: 'Демо-Пісня', artist: 'Лад' }), 'демо-пісня лад');
  });

  it('запит знаходить пісню незалежно від регістру', () => {
    const key = songSearchKey({ title: 'Ґанок', artist: 'Їжак' });
    assert.ok(key.includes(normalizeSearch('ЇЖАК')));
    assert.ok(key.includes(normalizeSearch('ґан')));
  });
});
