import type { Dictionary } from "@/shared/i18n";
import type { CopyState } from "../model/copies";

/** Позначка стану копії у списку: показується лише коли є що сказати. */
export function CopyStateBadge({ state, t }: { state: CopyState; t: Dictionary }) {
  if (state === "current") return null;
  const label =
    state === "outdated"
      ? t.copy.outdatedTitle
      : state === "original_deleted"
        ? t.copy.deletedTitle
        : t.copy.standalone;
  const tone = state === "standalone" ? "bg-line text-muted" : "bg-amber text-ink";
  return (
    <span className={`rounded-full px-2.5 py-0.5 text-xs font-semibold ${tone}`}>
      {state === "standalone" ? t.copy.badge : label}
    </span>
  );
}
