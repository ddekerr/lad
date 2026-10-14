import { LOCALES, type Dictionary, type Locale } from '@/shared/i18n';
import { setLocale } from '../api/set-locale';

/** Перемикач EN / UK. Працює через server action, тож без клієнтського JavaScript. */
export function LangSwitcher({ locale, t }: { locale: Locale; t: Dictionary }) {
  return (
    <form
      action={setLocale}
      role="group"
      aria-label={t.language.label}
      className="flex rounded-tile border border-dim p-0.5"
    >
      {LOCALES.map((code) => {
        const active = code === locale;
        return (
          <button
            key={code}
            type="submit"
            name="locale"
            value={code}
            aria-pressed={active}
            aria-label={t.language[code]}
            className={
              'h-8 min-w-10 rounded-lg px-2 text-sm font-semibold uppercase ' +
              (active ? 'bg-amber text-ink' : 'text-muted hover:text-cream')
            }
          >
            {code}
          </button>
        );
      })}
    </form>
  );
}
