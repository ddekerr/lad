import assert from 'node:assert/strict';
import { describe, it } from 'node:test';
import { loginCodeState } from './login-code-state';

const now = new Date('2026-01-01T12:00:00Z');
const code = (over: Partial<{ expiresAt: Date; attempts: number }> = {}) => ({
  expiresAt: new Date('2026-01-01T12:10:00Z'),
  attempts: 0,
  ...over,
});

describe('loginCodeState', () => {
  it('немає активного коду: invalid', () => {
    assert.equal(loginCodeState(null, now, 5), 'invalid');
  });

  it('свіжий код із запасом спроб можна перевіряти', () => {
    assert.equal(loginCodeState(code(), now, 5), 'open');
    assert.equal(loginCodeState(code({ attempts: 4 }), now, 5), 'open');
  });

  it('код прострочений рівно в момент закінчення', () => {
    assert.equal(loginCodeState(code({ expiresAt: now }), now, 5), 'expired');
    assert.equal(loginCodeState(code({ expiresAt: new Date('2026-01-01T11:59:59Z') }), now, 5), 'expired');
  });

  it('вичерпані спроби блокують код', () => {
    assert.equal(loginCodeState(code({ attempts: 5 }), now, 5), 'too_many_attempts');
    assert.equal(loginCodeState(code({ attempts: 9 }), now, 5), 'too_many_attempts');
  });

  it('прострочення перевіряється раніше за спроби', () => {
    assert.equal(loginCodeState(code({ expiresAt: now, attempts: 9 }), now, 5), 'expired');
  });
});
