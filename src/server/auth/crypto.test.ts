import assert from 'node:assert/strict';
import { describe, it } from 'node:test';
import {
  generateLoginCode,
  generateSessionToken,
  hashLoginCode,
  hashSessionToken,
  normalizeCode,
  normalizeEmail,
  safeEqualHex,
} from './crypto';

describe('код із листа', () => {
  it('завжди 6 цифр', () => {
    for (let i = 0; i < 500; i++) {
      assert.match(generateLoginCode(), /^\d{6}$/);
    }
  });

  it('хеш залежить від email, коду й секрету', () => {
    const base = hashLoginCode('a@x.com', '123456', 'secret');
    assert.equal(base, hashLoginCode('A@X.com ', '123456', 'secret'));
    assert.notEqual(base, hashLoginCode('b@x.com', '123456', 'secret'));
    assert.notEqual(base, hashLoginCode('a@x.com', '654321', 'secret'));
    assert.notEqual(base, hashLoginCode('a@x.com', '123456', 'other'));
  });

  it('порівняння хешів', () => {
    const h = hashLoginCode('a@x.com', '123456', 's');
    assert.equal(safeEqualHex(h, h), true);
    assert.equal(safeEqualHex(h, hashLoginCode('a@x.com', '000000', 's')), false);
    assert.equal(safeEqualHex(h, 'abc'), false);
    assert.equal(safeEqualHex('', ''), false);
  });

  it('нормалізація коду', () => {
    assert.equal(normalizeCode(' 123456 '), '123456');
    assert.equal(normalizeCode('12345'), null);
    assert.equal(normalizeCode('12a456'), null);
    assert.equal(normalizeCode(123456), null);
  });
});

describe('токен сесії', () => {
  it('унікальний, а хеш стабільний і не дорівнює токену', () => {
    const a = generateSessionToken();
    const b = generateSessionToken();
    assert.notEqual(a, b);
    assert.ok(a.length >= 40);
    assert.equal(hashSessionToken(a), hashSessionToken(a));
    assert.notEqual(hashSessionToken(a), a);
  });
});

describe('email', () => {
  it('нормалізує регістр і пробіли', () => {
    assert.equal(normalizeEmail('  Name@Example.COM '), 'name@example.com');
  });

  it('відкидає хибні адреси', () => {
    assert.equal(normalizeEmail('no-at-sign'), null);
    assert.equal(normalizeEmail('a@b'), null);
    assert.equal(normalizeEmail('a b@c.com'), null);
    assert.equal(normalizeEmail(''), null);
    assert.equal(normalizeEmail(null), null);
    assert.equal(normalizeEmail('a@' + 'b'.repeat(260) + '.com'), null);
  });
});
