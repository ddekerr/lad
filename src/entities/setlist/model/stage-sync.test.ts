import assert from 'node:assert/strict';
import { describe, it } from 'node:test';
import { applyCommand, commandResult, nextStage, parseStagePrefs } from './stage-sync';
import type { StageItemView, StageStateView } from './stage-position';

const stage: StageStateView = {
  setlistId: 's',
  setlistName: 'Вечір',
  leaderId: 'u1',
  leaderName: 'Ann',
  item: 0,
  bar: 5,
  keyShift: 2,
  revision: 10,
  itemCount: 2,
};
const items = [{ keyShift: 0 }, { keyShift: -3 }] as StageItemView[];

describe('applyCommand (одразу показуємо команду ведучого)', () => {
  it('нова пісня скидає такт і бере тональність із сетлісту', () => {
    assert.deepEqual(applyCommand(stage, { type: 'item', item: 1 }, items), { ...stage, item: 1, bar: 0, keyShift: -3 });
  });

  it('пісня без запису в списку дає зсув 0', () => {
    assert.equal(applyCommand(stage, { type: 'item', item: 9 }, items).keyShift, 0);
  });

  it('такт міняє лише такт', () => {
    assert.deepEqual(applyCommand(stage, { type: 'bar', bar: 7 }, items), { ...stage, bar: 7 });
  });

  it('тональність міняє лише зсув', () => {
    assert.deepEqual(applyCommand(stage, { type: 'shift', shift: -1 }, items), { ...stage, keyShift: -1 });
  });
});

describe('nextStage (відповідь опитування)', () => {
  it('stage: null означає, що сцену завершено', () => {
    assert.deepEqual(nextStage({ stage: null }, 10), { kind: 'ended' });
  });

  it('новіша або та сама ревізія оновлює стан', () => {
    assert.deepEqual(nextStage({ stage: { ...stage, revision: 11 } }, 10), { kind: 'update', stage: { ...stage, revision: 11 } });
    assert.equal(nextStage({ stage: { ...stage, revision: 10 } }, 10).kind, 'update');
  });

  it('старішу ревізію ігноруємо (запізніла відповідь)', () => {
    assert.deepEqual(nextStage({ stage: { ...stage, revision: 9 } }, 10), { kind: 'keep' });
  });

  it('без змін (changed: false) нічого не робимо', () => {
    assert.deepEqual(nextStage({ changed: false }, 10), { kind: 'keep' });
  });
});

describe('commandResult (відповідь на команду ведучого)', () => {
  it('успіх віддає підтверджений стан', () => {
    assert.deepEqual(commandResult(true, 200, { stage }), { kind: 'confirmed', stage });
  });

  it('404 означає, що сцену завершено', () => {
    assert.deepEqual(commandResult(false, 404, null), { kind: 'ended' });
  });

  it('інша помилка або обрив мережі просить звірити стан з сервером', () => {
    assert.deepEqual(commandResult(false, 500, null), { kind: 'resync' });
    assert.deepEqual(commandResult(false, undefined, null), { kind: 'resync' });
    assert.deepEqual(commandResult(true, 200, {}), { kind: 'resync' });
  });
});

describe('parseStagePrefs (налаштування на цьому пристрої)', () => {
  const views = ['text', 'both', 'chords', 'part'];
  const parse = (raw: string | null) => parseStagePrefs(raw, views, 20, 80);

  it('читає коректні налаштування', () => {
    assert.deepEqual(parse('{"view":"chords","level":"easy","size":44}'), { view: 'chords', level: 'easy', size: 44 });
  });

  it('відкидає невідомий вигляд і обмежує розмір межами', () => {
    assert.deepEqual(parse('{"view":"zzz","size":5}'), { size: 20 });
    assert.deepEqual(parse('{"size":500}'), { size: 80 });
  });

  it('порожнє сховище, null і зіпсований JSON дають порожні налаштування', () => {
    assert.deepEqual(parse(null), {});
    assert.deepEqual(parse('null'), {});
    assert.deepEqual(parse('{broken'), {});
  });

  it('розмір не числом ігнорується', () => {
    assert.deepEqual(parse('{"size":"big"}'), {});
  });
});
