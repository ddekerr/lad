/**
 * Клієнт Anthropic Messages API через fetch (без додаткових залежностей).
 * Модель змушуємо відповісти викликом інструмента, тож отримуємо структурований JSON.
 */
import { PART_TOOL } from '@/entities/song-copy';
import { MODEL_MAX_TOKENS, MODEL_TIMEOUT_MS } from './config';
import { AiUnavailableError, type ModelClient } from './generate';

const API_URL = 'https://api.anthropic.com/v1/messages';
const API_VERSION = '2023-06-01';

type ApiResponse = {
  stop_reason?: string;
  content?: { type: string; name?: string; input?: unknown }[];
};

export function anthropicClient(config: { apiKey: string; model: string }): ModelClient {
  return async ({ system, messages }) => {
    let response: Response;
    try {
      response = await fetch(API_URL, {
        method: 'POST',
        headers: {
          'content-type': 'application/json',
          'x-api-key': config.apiKey,
          'anthropic-version': API_VERSION,
        },
        body: JSON.stringify({
          model: config.model,
          max_tokens: MODEL_MAX_TOKENS,
          system,
          messages,
          tools: [PART_TOOL],
          tool_choice: { type: 'tool', name: PART_TOOL.name },
        }),
        signal: AbortSignal.timeout(MODEL_TIMEOUT_MS),
      });
    } catch {
      throw new AiUnavailableError('network_or_timeout');
    }

    if (!response.ok) throw new AiUnavailableError(`http_${response.status}`);

    const data = (await response.json().catch(() => null)) as ApiResponse | null;
    if (data?.stop_reason === 'max_tokens') throw new AiUnavailableError('truncated');
    const call = data?.content?.find((block) => block.type === 'tool_use' && block.name === PART_TOOL.name);
    if (!call) throw new AiUnavailableError('no_tool_call');
    return call.input;
  };
}
