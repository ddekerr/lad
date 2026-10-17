import assert from 'node:assert/strict';
import { describe, it } from 'node:test';
import { parseBars } from '@/shared/lib/bars';
import { parseDifficulty, pitchToMidi, validatePart } from './part';
import { buildGenerationInput, buildPrompt, MAX_PART_BARS } from './part-input';

const bars = (body: string) => parseBars(body).bars;
const ok = (notes: unknown[][]) => ({ bars: notes.map((n, i) => ({ bar: i + 1, notes: n })) });

describe('pitchToMidi', () => {
  it('рахує MIDI', () => {
    assert.equal(pitchToMidi('E1'), 28);
    assert.equal(pitchToMidi('A1'), 33);
    assert.equal(pitchToMidi('C4'), 60);
    assert.equal(pitchToMidi('G4'), 67);
    assert.equal(pitchToMidi('F#2'), 42);
    assert.equal(pitchToMidi('Bb1'), 34);
  });

  it('відкидає хибне', () => {
    for (const value of ['', 'H1', 'E', '1', 'e1', 'E#', 'Cb', 'E10']) assert.equal(pitchToMidi(value), null);
  });
});

describe('parseDifficulty', () => {
  it('приймає три рівні', () => {
    assert.equal(parseDifficulty('easy'), 'easy');
    assert.equal(parseDifficulty('hard'), 'hard');
    assert.equal(parseDifficulty('Easy'), null);
    assert.equal(parseDifficulty(null), null);
  });
});

describe('validatePart', () => {
  const song = bars('| [Am]a | [G]b |');

  it('приймає правильну партію й сортує ноти', () => {
    const result = validatePart(
      ok([
        [
          { beat: 3, length: 2, pitch: 'E2' },
          { beat: 1, length: 2, pitch: 'A1' },
        ],
        [{ beat: 1, length: 4, pitch: 'G1' }],
      ]),
      song,
      '4/4',
    );
    assert.equal(result.ok, true);
    if (result.ok)
      assert.deepEqual(
        result.notes[0].map((n) => n.pitch),
        ['A1', 'E2'],
      );
  });

  it('вимагає потрібну кількість тактів і порядок', () => {
    const one = validatePart(ok([[{ beat: 1, length: 4, pitch: 'A1' }]]), song, '4/4');
    assert.equal(one.ok, false);
    const swapped = validatePart(
      {
        bars: [
          { bar: 2, notes: [{ beat: 1, length: 4, pitch: 'G1' }] },
          { bar: 1, notes: [{ beat: 1, length: 4, pitch: 'A1' }] },
        ],
      },
      song,
      '4/4',
    );
    assert.equal(swapped.ok, false);
  });

  it('відкидає все, що не масив тактів', () => {
    for (const value of [null, undefined, 'x', 5, {}, { bars: 'x' }])
      assert.equal(validatePart(value, song, '4/4').ok, false);
  });

  it('перевіряє долі, довжини, вихід за такт і діапазон', () => {
    const bad = (note: unknown) => validatePart(ok([[note], [{ beat: 1, length: 4, pitch: 'G1' }]]), song, '4/4');
    assert.equal(bad({ beat: 0, length: 1, pitch: 'A1' }).ok, false);
    assert.equal(bad({ beat: 5, length: 1, pitch: 'A1' }).ok, false);
    assert.equal(bad({ beat: 1.1, length: 1, pitch: 'A1' }).ok, false);
    assert.equal(bad({ beat: 1, length: 0, pitch: 'A1' }).ok, false);
    assert.equal(bad({ beat: 3, length: 3, pitch: 'A1' }).ok, false);
    assert.equal(bad({ beat: 1, length: 1, pitch: 'D1' }).ok, false);
    assert.equal(bad({ beat: 1, length: 1, pitch: 'A4' }).ok, false);
    assert.equal(bad({ beat: 1, length: 1, pitch: 'nope' }).ok, false);
    assert.equal(bad(null).ok, false);
  });

  it('забороняє накладання нот', () => {
    const result = validatePart(
      ok([
        [
          { beat: 1, length: 3, pitch: 'A1' },
          { beat: 3, length: 1, pitch: 'E2' },
        ],
        [{ beat: 1, length: 4, pitch: 'G1' }],
      ]),
      song,
      '4/4',
    );
    assert.equal(result.ok, false);
  });

  it('вимагає ноту на основі кожного акорда', () => {
    const split = bars('| [Am]a [G]b |');
    const good = validatePart(
      ok([
        [
          { beat: 1, length: 2, pitch: 'A1' },
          { beat: 3, length: 2, pitch: 'G1' },
        ],
      ]),
      split,
      '4/4',
    );
    assert.equal(good.ok, true);
    const wrong = validatePart(
      ok([
        [
          { beat: 1, length: 2, pitch: 'A1' },
          { beat: 3, length: 2, pitch: 'B1' },
        ],
      ]),
      split,
      '4/4',
    );
    assert.equal(wrong.ok, false);
  });

  it('для акорда з басом шукає бас, а не основу', () => {
    const slash = bars('| [C/E]a |');
    assert.equal(validatePart(ok([[{ beat: 1, length: 4, pitch: 'E1' }]]), slash, '4/4').ok, true);
    assert.equal(validatePart(ok([[{ beat: 1, length: 4, pitch: 'C2' }]]), slash, '4/4').ok, false);
  });

  it('вимагає ноти в кожному такті й знає розмір', () => {
    assert.equal(validatePart(ok([[], [{ beat: 1, length: 4, pitch: 'G1' }]]), song, '4/4').ok, false);
    assert.equal(
      validatePart(ok([[{ beat: 1, length: 4, pitch: 'A1' }], [{ beat: 1, length: 4, pitch: 'G1' }]]), song, '7/3').ok,
      false,
    );
  });

  it('у 6/8 долі йдуть до 6', () => {
    const six = bars('| [Am]a |');
    assert.equal(validatePart(ok([[{ beat: 1, length: 6, pitch: 'A1' }]]), six, '6/8').ok, true);
    assert.equal(validatePart(ok([[{ beat: 1, length: 7, pitch: 'A1' }]]), six, '6/8').ok, false);
  });

  it('обмежує кількість повідомлень про проблеми', () => {
    const many = bars(Array.from({ length: 40 }, () => '| [Am]a').join('\n'));
    const result = validatePart(ok(many.map(() => [])), many, '4/4');
    assert.equal(result.ok, false);
    if (!result.ok) assert.ok(result.problems.length <= 12);
  });
});

describe('buildGenerationInput', () => {
  const copy = {
    body: '{verse: Куплет 1}\n| [Am]Слова [G]тут | [F]ще |\n{chorus}\n| [C]x |',
    originalKey: 'Am',
    keyShift: 0,
    bpm: 100,
    timeSignature: '4/4',
    sectionDynamics: { 'куплет 1': 2, chorus: 5 },
  };

  it('збирає вхід по тактах із динамікою розділів', () => {
    const result = buildGenerationInput(copy, 'medium');
    assert.equal(result.ok, true);
    if (!result.ok) return;
    assert.equal(result.input.key, 'Am');
    assert.equal(result.input.beatsPerBar, 4);
    assert.deepEqual(result.input.bars, [
      { bar: 1, section: 'куплет 1', dynamics: 2, chords: ['Am', 'G'] },
      { bar: 2, section: 'куплет 1', dynamics: 2, chords: ['F'] },
      { bar: 3, section: 'chorus', dynamics: 5, chords: ['C'] },
    ]);
  });

  it('транспонує акорди й тональність на зсув копії', () => {
    const result = buildGenerationInput({ ...copy, keyShift: 2 }, 'easy');
    assert.equal(result.ok, true);
    if (result.ok) {
      assert.equal(result.input.key, 'Bm');
      assert.deepEqual(result.input.bars[0].chords, ['Bm', 'A']);
    }
  });

  it('не віддає текст пісні', () => {
    const result = buildGenerationInput(copy, 'easy');
    assert.equal(result.ok, true);
    if (result.ok) {
      const { system, user } = buildPrompt(result.input);
      assert.ok(!user.includes('Слова') && !system.includes('Слова'));
      assert.ok(user.includes('"chords":["Am","G"]'));
      assert.ok(system.includes('EASY'));
    }
  });

  it('повертає перелік відсутнього', () => {
    const result = buildGenerationInput({ ...copy, bpm: null, sectionDynamics: {} }, 'easy');
    assert.equal(result.ok, false);
    if (!result.ok && result.reason === 'missing_parameters') {
      assert.equal(result.missing.bpm, true);
      assert.deepEqual(result.missing.sections, ['куплет 1', 'chorus']);
    }
  });

  it('повертає проблеми тактів за розміром', () => {
    const result = buildGenerationInput({ ...copy, body: '| [Am]a [G]b [F]c |', sectionDynamics: { main: 3 } }, 'easy');
    assert.equal(result.ok, false);
    if (!result.ok && result.reason === 'missing_parameters') assert.equal(result.barIssues.length, 1);
  });

  it('порожня пісня й завелика пісня', () => {
    const empty = buildGenerationInput({ ...copy, body: '', sectionDynamics: {} }, 'easy');
    assert.deepEqual(empty, { ok: false, reason: 'no_bars' });
    const body = Array.from({ length: MAX_PART_BARS + 1 }, () => '[Am]a').join('\n');
    const big = buildGenerationInput({ ...copy, body, sectionDynamics: { main: 3 } }, 'easy');
    assert.deepEqual(big, { ok: false, reason: 'too_many_bars', count: MAX_PART_BARS + 1 });
  });
});
