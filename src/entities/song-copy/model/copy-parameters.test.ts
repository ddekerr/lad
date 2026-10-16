import assert from 'node:assert/strict';
import { describe, it } from 'node:test';
import { parseCopyPatch } from './copy-input';
import { missingParameters, parseBpm, parseDynamics, parseTimeSignature, readDynamics } from './copy-parameters';

describe('parseBpm', () => {
  it('приймає цілі в межах', () => {
    assert.equal(parseBpm(120), 120);
    assert.equal(parseBpm(30), 30);
    assert.equal(parseBpm(300), 300);
  });

  it('відкидає все інше', () => {
    for (const value of [29, 301, 120.5, '120', null, undefined, NaN, Infinity]) assert.equal(parseBpm(value), null);
  });
});

describe('parseTimeSignature', () => {
  it('приймає підтримувані розміри', () => {
    for (const value of ['2/4', '3/4', '4/4', '5/4', '6/8', '9/8', '12/8'])
      assert.equal(parseTimeSignature(value), value);
  });

  it('відкидає невідомі', () => {
    for (const value of ['7/4', '4/4 ', '44', '', 4, null]) assert.equal(parseTimeSignature(value), null);
  });
});

describe('parseDynamics', () => {
  it('приймає об’єкт id → 1..5', () => {
    assert.deepEqual(parseDynamics({ chorus: 5, 'куплет 1': 2 }), { chorus: 5, 'куплет 1': 2 });
    assert.deepEqual(parseDynamics({}), {});
  });

  it('відкидає хибні значення й форму', () => {
    assert.equal(parseDynamics({ a: 0 }), null);
    assert.equal(parseDynamics({ a: 6 }), null);
    assert.equal(parseDynamics({ a: 2.5 }), null);
    assert.equal(parseDynamics({ a: '3' }), null);
    assert.equal(parseDynamics({ '': 3 }), null);
    assert.equal(parseDynamics({ ['x'.repeat(61)]: 3 }), null);
    assert.equal(parseDynamics([1, 2]), null);
    assert.equal(parseDynamics(null), null);
    assert.equal(parseDynamics('x'), null);
  });

  it('обмежує кількість записів', () => {
    const many = Object.fromEntries(Array.from({ length: 51 }, (_, i) => [`s${i}`, 3]));
    assert.equal(parseDynamics(many), null);
  });

  it('відкидає ключ __proto__ і не отруює прототип', () => {
    assert.equal(parseDynamics(JSON.parse('{"__proto__": 3, "chorus": 4}')), null);
    assert.equal(({} as Record<string, unknown>).polluted, undefined);
  });
});

describe('readDynamics', () => {
  it('залишає лише коректні записи', () => {
    assert.deepEqual(readDynamics({ chorus: 4, bad: 9, text: 'x' }), { chorus: 4 });
    assert.deepEqual(readDynamics(null), {});
    assert.deepEqual(readDynamics([1]), {});
    assert.deepEqual(readDynamics('x'), {});
  });
});

describe('missingParameters', () => {
  const body = '{verse: Куплет 1}\n[Am]a\n{chorus}\n[G]b\n{verse: Куплет 2}\n[Am]c';

  it('усе бракує', () => {
    assert.deepEqual(missingParameters({ body, bpm: null, timeSignature: null, sectionDynamics: {} }), {
      bpm: true,
      timeSignature: true,
      sections: ['куплет 1', 'chorus', 'куплет 2'],
      complete: false,
    });
  });

  it('рахує лише розділи без динаміки', () => {
    const result = missingParameters({
      body,
      bpm: 100,
      timeSignature: '4/4',
      sectionDynamics: { 'куплет 1': 2, chorus: 5 },
    });
    assert.deepEqual(result.sections, ['куплет 2']);
    assert.equal(result.complete, false);
  });

  it('усе задано; записи про зниклі розділи не заважають', () => {
    const result = missingParameters({
      body,
      bpm: 100,
      timeSignature: '4/4',
      sectionDynamics: { 'куплет 1': 2, chorus: 5, 'куплет 2': 3, bridge: 1 },
    });
    assert.equal(result.complete, true);
  });

  it('пісня без міток має один розділ main', () => {
    const result = missingParameters({ body: '[Am]a', bpm: 90, timeSignature: '3/4', sectionDynamics: {} });
    assert.deepEqual(result.sections, ['main']);
    assert.equal(
      missingParameters({ body: '[Am]a', bpm: 90, timeSignature: '3/4', sectionDynamics: { main: 2 } }).complete,
      true,
    );
  });

  it('порожній текст не вимагає динаміки', () => {
    assert.equal(missingParameters({ body: '', bpm: 90, timeSignature: '3/4', sectionDynamics: {} }).complete, true);
  });
});

describe('parseCopyPatch: параметри партій', () => {
  it('приймає й очищає значення', () => {
    assert.deepEqual(parseCopyPatch({ bpm: 120, timeSignature: '6/8', sectionDynamics: { chorus: 5 } }), {
      ok: true,
      data: { bpm: 120, timeSignature: '6/8', sectionDynamics: { chorus: 5 } },
    });
    assert.deepEqual(parseCopyPatch({ bpm: null, timeSignature: null }), {
      ok: true,
      data: { bpm: null, timeSignature: null },
    });
  });

  it('повертає окремі коди помилок', () => {
    assert.deepEqual(parseCopyPatch({ bpm: 10 }), { ok: false, error: 'invalid_bpm' });
    assert.deepEqual(parseCopyPatch({ timeSignature: '7/4' }), { ok: false, error: 'invalid_time_signature' });
    assert.deepEqual(parseCopyPatch({ sectionDynamics: { a: 9 } }), { ok: false, error: 'invalid_dynamics' });
  });

  it('невідомі поля ігноруються, а порожній запит це помилка', () => {
    assert.deepEqual(parseCopyPatch({ other: 1 }), { ok: false, error: 'empty_patch' });
  });
});
