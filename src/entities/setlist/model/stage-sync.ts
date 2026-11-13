import type { StageCommand, StageItemView, StageStateView } from './stage-position';

/** Стан сцени одразу після команди ведучого, ще до відповіді сервера. */
export function applyCommand(
  current: StageStateView,
  command: StageCommand,
  items: readonly Pick<StageItemView, 'keyShift'>[],
): StageStateView {
  if (command.type === 'item') {
    return { ...current, item: command.item, bar: 0, keyShift: items[command.item]?.keyShift ?? 0 };
  }
  if (command.type === 'bar') return { ...current, bar: command.bar };
  return { ...current, keyShift: command.shift };
}

export type PollOutcome = { kind: 'ended' } | { kind: 'update'; stage: StageStateView } | { kind: 'keep' };

/** Що робити з відповіддю опитування: сцену завершено, є свіжий стан чи нічого нового. */
export function nextStage(
  data: { changed?: boolean; stage?: StageStateView | null },
  revision: number,
): PollOutcome {
  if (data.stage === null) return { kind: 'ended' };
  if (data.stage && data.stage.revision >= revision) return { kind: 'update', stage: data.stage };
  return { kind: 'keep' };
}

export type CommandOutcome = { kind: 'confirmed'; stage: StageStateView } | { kind: 'ended' } | { kind: 'resync' };

/** Що робити з відповіддю на команду: прийняти стан сервера, завершити сцену або звірити стан. */
export function commandResult(
  ok: boolean,
  status: number | undefined,
  data: { stage?: StageStateView } | null,
): CommandOutcome {
  if (ok && data?.stage) return { kind: 'confirmed', stage: data.stage };
  return status === 404 ? { kind: 'ended' } : { kind: 'resync' };
}

export type StagePrefs = { view?: string; level?: string; size?: number };

/** Читає свої налаштування сцени зі сховища. Зіпсоване або відсутнє дає порожній об'єкт. */
export function parseStagePrefs(raw: string | null, views: readonly string[], min: number, max: number): StagePrefs {
  let saved: { view?: unknown; level?: unknown; size?: unknown } | null;
  try {
    saved = JSON.parse(raw ?? 'null');
  } catch {
    return {};
  }
  const prefs: StagePrefs = {};
  if (typeof saved?.view === 'string' && views.includes(saved.view)) prefs.view = saved.view;
  if (typeof saved?.level === 'string' && saved.level) prefs.level = saved.level;
  if (typeof saved?.size === 'number') prefs.size = Math.max(min, Math.min(max, saved.size));
  return prefs;
}
