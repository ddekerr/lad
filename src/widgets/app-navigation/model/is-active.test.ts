import assert from 'node:assert/strict';
import { describe, it } from 'node:test';
import { isActive } from './is-active';

describe('isActive', () => {
  it('«Каталог» активний на головній і на сторінках пісень', () => {
    assert.equal(isActive('/', '/'), true);
    assert.equal(isActive('/songs/abc', '/'), true);
    assert.equal(isActive('/playlists', '/'), false);
  });

  it('«Плейлисти» активні й на сторінках копій', () => {
    assert.equal(isActive('/playlists', '/playlists'), true);
    assert.equal(isActive('/playlists/1', '/playlists'), true);
    assert.equal(isActive('/copies/9', '/playlists'), true);
    assert.equal(isActive('/setlists', '/playlists'), false);
  });

  it('інші розділи: точний збіг або вкладений шлях, але не схожий префікс', () => {
    assert.equal(isActive('/setlists', '/setlists'), true);
    assert.equal(isActive('/setlists/5', '/setlists'), true);
    assert.equal(isActive('/setlists-old', '/setlists'), false);
    assert.equal(isActive('/stage', '/setlists'), false);
  });
});
