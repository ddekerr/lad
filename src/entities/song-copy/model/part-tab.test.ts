import assert from 'node:assert/strict';
import { describe, it } from 'node:test';
import { BASS_MAX_MIDI, BASS_MIN_MIDI, pitchToMidi, type PartData } from './part';
import { assignTab, buildPartTab, partDelta, transposeMidis } from './part-tab';

const midi = (pitch: string) => pitchToMidi(pitch) as number;

describe('partDelta', () => {
  it('рахує різницю зсувів за модулем 12', () => {
    assert.equal(partDelta(0, 0), 0);
    assert.equal(partDelta(2, 0), 2);
    assert.equal(partDelta(1, 3), 10);
    assert.equal(partDelta(5, undefined), 5);
  });
});

describe('transposeMidis', () => {
  it('зсуває на потрібну кількість півтонів', () => {
    assert.deepEqual(transposeMidis([midi('A1'), midi('D2')], 2), [midi('B1'), midi('E2')]);
  });

  it('нуль лишає ноти як є', () => {
    assert.deepEqual(transposeMidis([midi('E1'), midi('G2')], 0), [midi('E1'), midi('G2')]);
  });

  it('вибирає менший за модулем зсув, якщо всі ноти вміщаються (на 10 півтонів вгору = на 2 вниз)', () => {
    assert.deepEqual(transposeMidis([midi('G2')], 10), [midi('F2')]);
  });

  it('не виходить за діапазон: нижню ноту не опускає під E1', () => {
    const result = transposeMidis([midi('E1'), midi('A1')], 10);
    for (const value of result) assert.ok(value >= BASS_MIN_MIDI && value <= BASS_MAX_MIDI);
    assert.equal(result[1] - result[0], 5);
  });

  it('якщо партія не вміщується в діапазон, переносить ноти по октавах', () => {
    const result = transposeMidis([BASS_MIN_MIDI, BASS_MAX_MIDI], 5);
    for (const value of result) assert.ok(value >= BASS_MIN_MIDI && value <= BASS_MAX_MIDI);
  });

  it('порожній список дає порожній', () => {
    assert.deepEqual(transposeMidis([], 3), []);
  });
});

describe('assignTab', () => {
  it('відкриті струни лягають на нульові лади', () => {
    const result = assignTab([midi('E1'), midi('A1'), midi('D2'), midi('G2')]);
    assert.deepEqual(result, [
      { string: 3, fret: 0 },
      { string: 2, fret: 0 },
      { string: 1, fret: 0 },
      { string: 0, fret: 0 },
    ]);
  });

  it('тримається однієї позиції руки: C2 після D2 і E2 лишається на струні A', () => {
    const result = assignTab([midi('G1'), midi('A1'), midi('B1'), midi('C2')]);
    assert.ok(result.every((item) => item !== null));
    const frets = result.map((item) => item!.fret);
    assert.ok(Math.max(...frets) <= 5, `лади ${frets.join(',')}`);
  });

  it('не вимагає вищих за 12 ладів там, де є низька позиція', () => {
    const result = assignTab([midi('G2'), midi('A2'), midi('C3')]);
    assert.ok(result.every((item) => item !== null && item.fret <= 12));
  });

  it('нота поза діапазоном лишається без позиції', () => {
    assert.equal(assignTab([20])[0], null);
    assert.equal(assignTab([100])[0], null);
  });

  it('кожна позиція відтворює свою висоту', () => {
    const notes = ['E1', 'F#1', 'Bb1', 'C#2', 'F2', 'G2', 'D3', 'G3'].map(midi);
    const open = [43, 38, 33, 28];
    assignTab(notes).forEach((position, i) => assert.equal(open[position!.string] + position!.fret, notes[i]));
  });
});

const part: PartData = {
  timeSignature: '4/4',
  shift: 0,
  bars: [
    {
      bar: 1,
      section: 'verse',
      chords: ['Am', 'G'],
      notes: [
        { beat: 1, length: 2, pitch: 'A1' },
        { beat: 3, length: 2, pitch: 'G1' },
      ],
    },
    { bar: 2, section: 'verse', chords: ['F'], notes: [{ beat: 1, length: 4, pitch: 'F1' }] },
    { bar: 3, section: 'chorus', chords: ['C'], notes: [{ beat: 1, length: 4, pitch: 'C2' }] },
  ],
};

describe('buildPartTab', () => {
  it('без зсуву віддає ті самі акорди й ноти, акорди ділять такт порівну', () => {
    const tab = buildPartTab(part, 'Am', 0);
    assert.equal(tab.beats, 4);
    assert.deepEqual(tab.bars[0].chords, [
      { beat: 1, name: 'Am' },
      { beat: 3, name: 'G' },
    ]);
    assert.deepEqual(
      tab.bars[0].notes.map((n) => [n.string, n.fret]),
      [
        [2, 0],
        [3, 3],
      ],
    );
  });

  it('позначає початок розділів', () => {
    const tab = buildPartTab(part, 'Am', 0);
    assert.deepEqual(
      tab.bars.map((bar) => bar.sectionStart),
      [true, false, true],
    );
  });

  it('транспонує акорди й ноти разом', () => {
    const tab = buildPartTab(part, 'Am', 2);
    assert.deepEqual(
      tab.bars[0].chords.map((c) => c.name),
      ['Bm', 'A'],
    );
    // A1 → B1: струна A, 2-й лад
    assert.deepEqual([tab.bars[0].notes[0].string, tab.bars[0].notes[0].fret], [2, 2]);
  });

  it('враховує зсув, з яким партію згенеровано', () => {
    const shifted: PartData = { ...part, shift: 2 };
    const same = buildPartTab(shifted, 'Am', 2);
    assert.deepEqual(
      same.bars[0].chords.map((c) => c.name),
      ['Am', 'G'],
    );
    const back = buildPartTab(shifted, 'Am', 0);
    assert.deepEqual(
      back.bars[0].chords.map((c) => c.name),
      ['Gm', 'F'],
    );
  });

  it('без розміру в даних бере кількість долей із нот', () => {
    const tab = buildPartTab(
      { bars: [{ bar: 1, chords: ['C'], notes: [{ beat: 1, length: 6, pitch: 'C2' }] }] },
      'C',
      0,
    );
    assert.equal(tab.beats, 6);
  });
});
