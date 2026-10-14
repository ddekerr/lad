import assert from 'node:assert/strict';
import { describe, it } from 'node:test';
import {
  lineChords,
  lineText,
  parseLine,
  parseSong,
  parseKey,
  shouldPreferFlats,
  transposeChord,
  transposeKey,
} from './index';

describe('parseLine', () => {
  it('розбиває рядок на акорд і текст за ним', () => {
    assert.deepEqual(parseLine('[Am]Hi [G]there'), [
      { chord: 'Am', text: 'Hi ' },
      { chord: 'G', text: 'there' },
    ]);
  });

  it('зберігає текст перед першим акордом', () => {
    assert.deepEqual(parseLine('Hi [G]there'), [
      { chord: null, text: 'Hi ' },
      { chord: 'G', text: 'there' },
    ]);
  });

  it('рядок без акордів лишається одним фрагментом', () => {
    assert.deepEqual(parseLine('Just words'), [{ chord: null, text: 'Just words' }]);
  });

  it('акорд наприкінці рядка має порожній текст', () => {
    assert.deepEqual(parseLine('Word [C]'), [
      { chord: null, text: 'Word ' },
      { chord: 'C', text: '' },
    ]);
  });

  it('порожній рядок дає порожній масив', () => {
    assert.deepEqual(parseLine(''), []);
  });

  it('два акорди підряд дають фрагмент без тексту', () => {
    assert.deepEqual(parseLine('[C][G]x'), [
      { chord: 'C', text: '' },
      { chord: 'G', text: 'x' },
    ]);
  });

  it('працює з кирилицею', () => {
    assert.deepEqual(parseLine('[Am]Слова [G]тут'), [
      { chord: 'Am', text: 'Слова ' },
      { chord: 'G', text: 'тут' },
    ]);
  });
});

describe('parseSong', () => {
  it('розбиває на рядки й зберігає порожні як відступи', () => {
    const lines = parseSong('[G]One\r\n\n[C]Two');
    assert.equal(lines.length, 3);
    assert.deepEqual(lines[1], []);
    assert.equal(lineText(lines[2]), 'Two');
    assert.deepEqual(lineChords(lines[0]), ['G']);
  });
});

describe('transposeChord', () => {
  it('зсуває просту ноту вгору', () => {
    assert.equal(transposeChord('G', 2), 'A');
  });

  it('переходить через межу октави', () => {
    assert.equal(transposeChord('B', 1), 'C');
    assert.equal(transposeChord('C', -1), 'B');
  });

  it('зберігає якість акорда', () => {
    assert.equal(transposeChord('Am7', 3), 'Cm7');
    assert.equal(transposeChord('Csus4', 2), 'Dsus4');
    assert.equal(transposeChord('Cmaj7', 2), 'Dmaj7');
    assert.equal(transposeChord('Em7b5', 1), 'Fm7b5');
  });

  it('зсуває бас після скісної риски', () => {
    assert.equal(transposeChord('C/E', 2), 'D/F#');
    assert.equal(transposeChord('G/B', 2), 'A/C#');
  });

  it('використовує бемолі, коли їх просять', () => {
    assert.equal(transposeChord('G', 3, true), 'Bb');
    assert.equal(transposeChord('G', 3, false), 'A#');
    assert.equal(transposeChord('C/E', 1, true), 'Db/F');
  });

  it('розуміє бемолі й дієзи у вхідному акорді', () => {
    assert.equal(transposeChord('Bb', 2), 'C');
    assert.equal(transposeChord('F#m', 1), 'Gm');
    assert.equal(transposeChord('Ab', 4, false), 'C');
  });

  it('нульовий зсув не змінює акорд', () => {
    assert.equal(transposeChord('Dm7', 0), 'Dm7');
  });

  it('невпізнаний акорд повертає без змін', () => {
    assert.equal(transposeChord('N.C.', 5), 'N.C.');
    assert.equal(transposeChord('riff', 5), 'riff');
    assert.equal(transposeChord('Cxyz', 2), 'Cxyz');
  });
});

describe('тональності', () => {
  it('розбирає мажорні й мінорні тональності', () => {
    assert.deepEqual(parseKey('G'), { index: 7, minor: false });
    assert.deepEqual(parseKey('Am'), { index: 9, minor: true });
    assert.deepEqual(parseKey('Bb'), { index: 10, minor: false });
    assert.equal(parseKey('H'), null);
  });

  it('транспонує тональність із правильним записом', () => {
    assert.equal(transposeKey('G', 2), 'A');
    assert.equal(transposeKey('G', 3), 'Bb');
    assert.equal(transposeKey('Am', 1), 'Bbm');
    assert.equal(transposeKey('Am', 2), 'Bm');
    assert.equal(transposeKey('C', 6), 'F#');
    assert.equal(transposeKey('???', 3), '???');
  });

  it('вибирає бемолі за цільовою тональністю', () => {
    assert.equal(shouldPreferFlats('G', 3), true); // Bb
    assert.equal(shouldPreferFlats('G', 2), false); // A
    assert.equal(shouldPreferFlats('C', 5), true); // F
    assert.equal(shouldPreferFlats('???', 3), false);
  });

  it('повний цикл: пісня в G, зсув +3, акорди в Bb-ключі з бемолями', () => {
    const flats = shouldPreferFlats('G', 3);
    const chords = ['G', 'D', 'Em', 'C'].map((c) => transposeChord(c, 3, flats));
    assert.deepEqual(chords, ['Bb', 'F', 'Gm', 'Eb']);
  });
});
