import assert from 'node:assert/strict';
import { describe, it } from 'node:test';
import { callbackCode, verifiedGoogleProfile } from './google-callback';

const params = (query: string) => new URLSearchParams(query);

describe('callbackCode', () => {
  it('віддає code, коли state збігається з очікуваним', () => {
    assert.equal(callbackCode(params('code=abc&state=s1'), 's1'), 'abc');
  });

  it('без code, state або очікуваного state відмовляє', () => {
    assert.equal(callbackCode(params('state=s1'), 's1'), null);
    assert.equal(callbackCode(params('code=abc'), 's1'), null);
    assert.equal(callbackCode(params('code=abc&state=s1'), undefined), null);
  });

  it('чужий state відхиляється (захист від підробленого запиту)', () => {
    assert.equal(callbackCode(params('code=abc&state=evil'), 's1'), null);
  });
});

describe('verifiedGoogleProfile', () => {
  it('приймає підтверджену пошту й нормалізує її', () => {
    assert.deepEqual(verifiedGoogleProfile({ sub: '42', email: ' Ann@Example.COM ', email_verified: true }), {
      sub: '42',
      email: 'ann@example.com',
    });
  });

  it('відхиляє непідтверджену пошту', () => {
    assert.equal(verifiedGoogleProfile({ sub: '42', email: 'a@b.co', email_verified: false }), null);
    assert.equal(verifiedGoogleProfile({ sub: '42', email: 'a@b.co' }), null);
  });

  it('відхиляє профіль без sub або з хибною поштою', () => {
    assert.equal(verifiedGoogleProfile({ email: 'a@b.co', email_verified: true }), null);
    assert.equal(verifiedGoogleProfile({ sub: '42', email: 'not-an-email', email_verified: true }), null);
    assert.equal(verifiedGoogleProfile({ sub: '42', email_verified: true }), null);
  });
});
