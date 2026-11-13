import assert from 'node:assert/strict';
import { describe, it } from 'node:test';
import type { BuildInputResult } from './part-input';
import { generationRejection, MAX_PART_BARS } from './part-input';

type Failed = Extract<BuildInputResult, { ok: false }>;

describe('generationRejection (тіло відповіді 400)', () => {
  it('бракує параметрів: що саме бракує й не більше 20 проблем із тактами', () => {
    const issues = Array.from({ length: 25 }, (_, i) => ({ bar: i + 1, line: 1, code: 'uneven' as const, chords: 1, beats: 3 }));
    const missing = { bpm: true, timeSignature: false, sections: [], complete: false };
    const failed = { ok: false, reason: 'missing_parameters', missing, barIssues: issues } as unknown as Failed;
    const body = generationRejection(failed);
    assert.equal(body.error, 'missing_parameters');
    assert.deepEqual(body.missing, missing);
    assert.equal((body.barIssues as unknown[]).length, 20);
  });

  it('немає тактів: лише код і ліміт', () => {
    assert.deepEqual(generationRejection({ ok: false, reason: 'no_bars' }), { error: 'no_bars', max: MAX_PART_BARS });
  });

  it('забагато тактів: код і ліміт', () => {
    assert.deepEqual(generationRejection({ ok: false, reason: 'too_many_bars', count: 999 }), {
      error: 'too_many_bars',
      max: MAX_PART_BARS,
    });
  });
});
