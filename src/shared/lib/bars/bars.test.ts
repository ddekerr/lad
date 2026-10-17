import assert from 'node:assert/strict';
import { describe, it } from 'node:test';
import { beatsPerBar, parseBars, validateBars } from './index';

const chordsOf = (body: string) => parseBars(body).bars.map((bar) => bar.chords);

describe('parseBars: з рисками', () => {
  it('такт це те, що між рисками', () => {
    const result = parseBars('| [Am]Слова [G]тут | [F]ще слова |');
    assert.equal(result.marked, true);
    assert.deepEqual(
      result.bars.map((bar) => [bar.index, bar.chords]),
      [
        [1, ['Am', 'G']],
        [2, ['F']],
      ],
    );
  });

  it('такт без акорда продовжує попередній', () => {
    const result = parseBars('| [Am]слова | ще слова | [G]далі |');
    assert.deepEqual(chordsOf('| [Am]слова | ще слова | [G]далі |'), [['Am'], ['Am'], ['G']]);
    assert.deepEqual(
      result.bars.map((bar) => bar.held),
      [false, true, false],
    );
  });

  it('порожній такт між рисками тримає попередній акорд', () => {
    assert.deepEqual(chordsOf('| [Am]a | | [G]b |'), [['Am'], ['Am'], ['G']]);
    assert.deepEqual(chordsOf('| [Am]a || [G]b |'), [['Am'], ['Am'], ['G']]);
  });

  it('риска на початку й в кінці рядка не створює порожніх тактів', () => {
    assert.deepEqual(chordsOf('| [Am]a |\n| [G]b |'), [['Am'], ['G']]);
    assert.deepEqual(chordsOf('[Am]a |\n[G]b |'), [['Am'], ['G']]);
  });

  it('такт може тривати кілька рядків, поки немає риски', () => {
    assert.deepEqual(chordsOf('| [Am]перший\n[G]другий | [F]x |'), [['Am', 'G'], ['F']]);
  });

  it('останній такт без закриваючої риски враховується', () => {
    assert.deepEqual(chordsOf('| [Am]a | [G]b'), [['Am'], ['G']]);
  });

  it('перший такт без акорда не має що продовжувати', () => {
    const bars = parseBars('| слова | [Am]a |').bars;
    assert.deepEqual(
      bars.map((bar) => [bar.chords, bar.held]),
      [
        [[], false],
        [['Am'], false],
      ],
    );
  });

  it('порожній текст і текст без акордів', () => {
    assert.deepEqual(parseBars('').bars, []);
    assert.deepEqual(chordsOf('| тільки слова |'), [[]]);
  });

  it('номер рядка такту', () => {
    const bars = parseBars('| [Am]a |\n\n| [G]b |').bars;
    assert.deepEqual(
      bars.map((bar) => bar.line),
      [1, 3],
    );
  });

  it('приймає перенос рядків Windows', () => {
    assert.deepEqual(chordsOf('| [Am]a |\r\n| [G]b |'), [['Am'], ['G']]);
  });
});

describe('parseBars: без рисок', () => {
  it('кожен акорд це окремий такт', () => {
    const result = parseBars('[Am]Слова [G]тут\n[F]ще');
    assert.equal(result.marked, false);
    assert.deepEqual(chordsOf('[Am]Слова [G]тут\n[F]ще'), [['Am'], ['G'], ['F']]);
  });

  it('рядки без акордів ігноруються', () => {
    assert.deepEqual(chordsOf('просто слова\n[C]x'), [['C']]);
  });
});

describe('parseBars: розділи', () => {
  it('такти знають свій розділ', () => {
    const body = '{verse: Куплет 1}\n| [Am]a | [G]b |\n{chorus}\n| [F]c |';
    assert.deepEqual(
      parseBars(body).bars.map((bar) => [bar.section, bar.chords]),
      [
        ['куплет 1', ['Am']],
        ['куплет 1', ['G']],
        ['chorus', ['F']],
      ],
    );
  });

  it('мітка розділу завершує незакритий такт', () => {
    const body = '{verse}\n| [Am]a\n{chorus}\n[G]b |';
    assert.deepEqual(
      parseBars(body).bars.map((bar) => [bar.section, bar.chords]),
      [
        ['verse', ['Am']],
        ['chorus', ['G']],
      ],
    );
  });

  it('риска в мітці розділу не вмикає режим із рисками', () => {
    const result = parseBars('{verse: A|B}\n[Am]a [G]b');
    assert.equal(result.marked, false);
  });

  it('до першої мітки розділ main', () => {
    assert.equal(parseBars('| [Am]a |').bars[0].section, 'main');
  });
});

describe('beatsPerBar', () => {
  it('бере кількість долей з розміру', () => {
    assert.equal(beatsPerBar('4/4'), 4);
    assert.equal(beatsPerBar('6/8'), 6);
    assert.equal(beatsPerBar('12/8'), 12);
    assert.equal(beatsPerBar('5/4'), 5);
  });

  it('хибний розмір це null', () => {
    for (const value of ['', '4', '0/4', '4/3', 'a/4', '4/4 ', '100/4']) assert.equal(beatsPerBar(value), null);
  });
});

describe('validateBars', () => {
  it('нічого не перевіряє без розміру', () => {
    assert.equal(validateBars(parseBars('| [Am]a |').bars, ''), null);
    assert.equal(validateBars(parseBars('| [Am]a |').bars, '7/3'), null);
  });

  it('акорди мають ділити долі порівну', () => {
    const bars = parseBars('| [Am]a [G]b [F]c | [C]d [G]e |').bars;
    assert.deepEqual(validateBars(bars, '4/4'), [{ bar: 1, line: 1, code: 'uneven', chords: 3, beats: 4 }]);
    assert.deepEqual(validateBars(bars, '6/8'), []);
  });

  it('3/4 дозволяє 1 і 3 акорди, але не 2', () => {
    const bars = parseBars('| [Am]a | [G]a [F]b [C]c | [Dm]a [E]b |').bars;
    assert.deepEqual(
      validateBars(bars, '3/4')?.map((issue) => issue.bar),
      [3],
    );
  });

  it('6/8 і 12/8 допускають більше варіантів', () => {
    const six = parseBars('| [A]a [B]b [C]c [D]d [E]e [F]f |').bars;
    assert.deepEqual(validateBars(six, '6/8'), []);
    assert.equal(validateBars(six, '4/4')?.length, 1);
    const twelve = parseBars('| [A]a [B]b [C]c [D]d |').bars;
    assert.deepEqual(validateBars(twelve, '12/8'), []);
  });

  it('такт без акорда й без попереднього дає no_chord', () => {
    const bars = parseBars('| слова | [Am]a |').bars;
    assert.deepEqual(validateBars(bars, '4/4'), [{ bar: 1, line: 1, code: 'no_chord', chords: 0, beats: 4 }]);
  });

  it('пісня без рисок: один акорд на такт завжди проходить', () => {
    for (const signature of ['2/4', '3/4', '4/4', '5/4', '6/8', '9/8', '12/8']) {
      assert.deepEqual(validateBars(parseBars('[Am]a [G]b [F]c').bars, signature), []);
    }
  });
});
