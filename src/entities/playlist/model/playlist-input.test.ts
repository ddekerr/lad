import assert from 'node:assert/strict';
import { describe, it } from 'node:test';
import { cleanPlaylistName, parseRoleFilter } from './playlist-input';

describe('введення плейлистів', () => {
  it('назва плейлиста', () => {
    assert.equal(cleanPlaylistName('  Sunday set '), 'Sunday set');
    assert.equal(cleanPlaylistName('   '), null);
    assert.equal(cleanPlaylistName('x'.repeat(81)), null);
    assert.equal(cleanPlaylistName(5), null);
  });

  it('фільтр ролі з query', () => {
    assert.deepEqual(parseRoleFilter(null), { kind: 'all' });
    assert.deepEqual(parseRoleFilter(''), { kind: 'all' });
    assert.deepEqual(parseRoleFilter('none'), { kind: 'none' });
    assert.deepEqual(parseRoleFilter('abc'), { kind: 'role', roleId: 'abc' });
  });
});
