import assert from 'node:assert/strict';
import { describe, it } from 'node:test';
import { parseBars } from '@/shared/lib/bars';
import {
  barOfLine,
  clampBar,
  lineOfBar,
  matchPartBar,
  parseStageCommand,
  sectionStarts,
  stepSection,
} from './stage-position';

const body = ['{verse}', '| [Am]a | [G]b |', '| [F]c | [C]d |', '{chorus}', '| [Am]e | [G]f |'].join('\n');
const { bars } = parseBars(body);

describe('parseStageCommand', () => {
  it('приймає три види команд', () => {
    assert.deepEqual(parseStageCommand({ type: 'item', item: 2 }, 3), { type: 'item', item: 2 });
    assert.deepEqual(parseStageCommand({ type: 'bar', bar: 5 }, 3), { type: 'bar', bar: 5 });
    assert.deepEqual(parseStageCommand({ type: 'shift', shift: 14 }, 3), { type: 'shift', shift: 2 });
    assert.deepEqual(parseStageCommand({ type: 'shift', shift: -1 }, 3), { type: 'shift', shift: 11 });
  });

  it('відкидає хибне й вихід за межі', () => {
    assert.equal(parseStageCommand({ type: 'item', item: 3 }, 3), null);
    assert.equal(parseStageCommand({ type: 'item', item: -1 }, 3), null);
    assert.equal(parseStageCommand({ type: 'bar', bar: 1.5 }, 3), null);
    assert.equal(parseStageCommand({ type: 'bar', bar: 99999 }, 3), null);
    assert.equal(parseStageCommand({ type: 'jump' }, 3), null);
    assert.equal(parseStageCommand(null, 3), null);
    assert.equal(parseStageCommand('item', 3), null);
  });
});

describe('такти й рядки', () => {
  it('такт ↔ рядок тексту', () => {
    assert.equal(bars.length, 6);
    assert.equal(lineOfBar(bars, 0), 2);
    assert.equal(lineOfBar(bars, 2), 3);
    assert.equal(lineOfBar(bars, 99), null);
    assert.equal(barOfLine(bars, 3), 2);
    assert.equal(barOfLine(bars, 1), null);
  });

  it('clampBar тримає номер у межах пісні', () => {
    assert.equal(clampBar(6, 10), 5);
    assert.equal(clampBar(6, -3), 0);
    assert.equal(clampBar(0, 4), 0);
  });
});

describe('розділи', () => {
  it('початки розділів', () => {
    assert.deepEqual(sectionStarts(bars), [0, 4]);
    assert.deepEqual(sectionStarts([]), []);
  });

  it('наступний і попередній розділ', () => {
    assert.equal(stepSection(bars, 1, 1), 4);
    assert.equal(stepSection(bars, 4, 1), 4);
    assert.equal(stepSection(bars, 5, -1), 4);
    assert.equal(stepSection(bars, 4, -1), 0);
    assert.equal(stepSection(bars, 0, -1), 0);
    assert.equal(stepSection([], 3, 1), 0);
  });
});

describe('matchPartBar', () => {
  const partBars = [{ section: 'verse' }, { section: 'verse' }, { section: 'chorus' }, { section: 'chorus' }];

  it('той самий розділ і зсув усередині розділу', () => {
    assert.equal(matchPartBar(bars, partBars, 1), 1);
    assert.equal(matchPartBar(bars, partBars, 4), 2);
    assert.equal(matchPartBar(bars, partBars, 5), 3);
  });

  it('не виходить за межі розділу партії', () => {
    assert.equal(matchPartBar(bars, partBars, 3), 1); // 4-й такт куплета, у партії лише 2
  });

  it('без розділів у партії бере номер такту', () => {
    assert.equal(matchPartBar(bars, [{}, {}, {}], 1), 1);
    assert.equal(matchPartBar(bars, [{}, {}, {}], 5), 2);
    assert.equal(matchPartBar(bars, [], 5), 0);
  });
});
