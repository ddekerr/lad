import assert from 'node:assert/strict';
import { describe, it } from 'node:test';
import { buildGenerationInput } from '@/entities/song-copy';
import { AiUnavailableError, generateBassPart, type ModelClient, type ModelRequest } from './generate';

const built = buildGenerationInput(
  {
    body: '{verse}\n| [Am]a | [G]b |',
    originalKey: 'Am',
    keyShift: 0,
    bpm: 90,
    timeSignature: '4/4',
    sectionDynamics: { verse: 3 },
  },
  'easy',
);
if (!built.ok) throw new Error('test setup');
const input = built.input;

const good = {
  bars: [
    { bar: 1, notes: [{ beat: 1, length: 4, pitch: 'A1' }] },
    { bar: 2, notes: [{ beat: 1, length: 4, pitch: 'G1' }] },
  ],
};
const bad = { bars: [{ bar: 1, notes: [{ beat: 1, length: 4, pitch: 'C2' }] }, good.bars[1]] };

function scripted(answers: unknown[], seen: ModelRequest[] = []): ModelClient {
  let i = 0;
  return async (request) => {
    seen.push(structuredClone(request));
    return answers[Math.min(i++, answers.length - 1)];
  };
}

describe('generateBassPart', () => {
  it('віддає партію з першої спроби й додає акорди до тактів', async () => {
    const result = await generateBassPart(input, scripted([good]), 3);
    assert.equal(result.ok, true);
    if (result.ok) {
      assert.equal(result.attempts, 1);
      assert.deepEqual(result.data.bars[0], {
        bar: 1,
        section: 'verse',
        chords: ['Am'],
        notes: [{ beat: 1, length: 4, pitch: 'A1' }],
      });
      assert.equal(result.data.timeSignature, '4/4');
      assert.equal(result.data.shift, input.shift);
    }
  });

  it('просить виправити й приймає другу спробу', async () => {
    const seen: ModelRequest[] = [];
    const result = await generateBassPart(input, scripted([bad, good], seen), 3);
    assert.equal(result.ok, true);
    if (result.ok) assert.equal(result.attempts, 2);
    assert.equal(seen.length, 2);
    assert.equal(seen[1].messages.length, 3);
    assert.match(seen[1].messages[2].content, /Bar 1/);
    assert.match(seen[1].messages[2].content, /root/);
  });

  it('здається після вичерпання спроб і повертає проблеми', async () => {
    const result = await generateBassPart(input, scripted([bad]), 3);
    assert.equal(result.ok, false);
    if (!result.ok) {
      assert.equal(result.attempts, 3);
      assert.ok(result.problems.length > 0);
    }
  });

  it('не віддає текст пісні моделі', async () => {
    const seen: ModelRequest[] = [];
    await generateBassPart(input, scripted([good], seen), 1);
    assert.ok(!JSON.stringify(seen[0]).includes('"a"'));
  });

  it('помилка зв’язку не ловиться й іде нагору', async () => {
    const failing: ModelClient = async () => {
      throw new AiUnavailableError('http_500');
    };
    await assert.rejects(generateBassPart(input, failing, 3), AiUnavailableError);
  });

  it('сміття замість партії це проблема, а не падіння', async () => {
    const result = await generateBassPart(input, scripted([undefined, 'x', null, { bars: 3 }]), 3);
    assert.equal(result.ok, false);
  });
});
