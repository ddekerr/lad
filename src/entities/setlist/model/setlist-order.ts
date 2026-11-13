/** Копія списку, де елемент на місці index зсунуто на delta. За межами списку null. */
export function moveItem<T>(items: readonly T[], index: number, delta: -1 | 1): T[] | null {
  const target = index + delta;
  if (index < 0 || index >= items.length || target < 0 || target >= items.length) return null;
  const next = [...items];
  [next[index], next[target]] = [next[target], next[index]];
  return next;
}

/** Копія списку, де в пісні на місці index тональність зсунуто на delta півтонів (кругом 0..11). */
export function shiftItemKey<T extends { keyShift: number }>(items: readonly T[], index: number, delta: number): T[] {
  return items.map((item, i) => (i === index ? { ...item, keyShift: (((item.keyShift + delta) % 12) + 12) % 12 } : item));
}
