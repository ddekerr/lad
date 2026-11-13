import assert from 'node:assert/strict';
import { describe, it } from 'node:test';
import { moveSetlistItem, shiftItemKey } from './setlist-order';

describe('moveSetlistItem', () => {
  it('рухає пісню вгору й вниз, не чіпаючи вихідний список', () => {
    const list = ['a', 'b', 'c'];
    assert.deepEqual(moveSetlistItem(list, 1, -1), ['b', 'a', 'c']);
    assert.deepEqual(moveSetlistItem(list, 1, 1), ['a', 'c', 'b']);
    assert.deepEqual(list, ['a', 'b', 'c']);
  });

  it('за межі списку не рухає (повертає null)', () => {
    assert.equal(moveSetlistItem(['a', 'b'], 0, -1), null);
    assert.equal(moveSetlistItem(['a', 'b'], 1, 1), null);
    assert.equal(moveSetlistItem([], 0, 1), null);
  });
});

describe('shiftItemKey', () => {
  const list = [{ keyShift: 0 }, { keyShift: 11 }, { keyShift: 5 }];

  it('міняє зсув лише в одної пісні', () => {
    assert.deepEqual(shiftItemKey(list, 2, 1), [{ keyShift: 0 }, { keyShift: 11 }, { keyShift: 6 }]);
  });

  it('зсув замикається в межах 0..11 в обидва боки', () => {
    assert.equal(shiftItemKey(list, 1, 1)[1].keyShift, 0);
    assert.equal(shiftItemKey(list, 0, -1)[0].keyShift, 11);
  });

  it('вихідний список не змінюється', () => {
    shiftItemKey(list, 0, 3);
    assert.equal(list[0].keyShift, 0);
  });
});
