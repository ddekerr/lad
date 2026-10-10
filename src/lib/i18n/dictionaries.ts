export const LOCALES = ["en", "uk"] as const;
export type Locale = (typeof LOCALES)[number];
export const DEFAULT_LOCALE: Locale = "en";
export const LOCALE_COOKIE = "lad-locale";

const en = {
  appName: "Лад",
  nav: { songs: "Songs", main: "Main navigation" },
  language: { label: "Language", en: "English", uk: "Українська" },
  catalog: {
    title: "Songs",
    searchLabel: "Search songs",
    searchPlaceholder: "Title or artist",
    searchButton: "Search",
    empty: "No songs found.",
    emptyHint: "Try another title or artist.",
    count: "songs",
    key: "Key",
  },
  song: {
    back: "Songs",
    notFound: "Song not found",
    notFoundHint: "It may have been removed from the catalog.",
    display: "Display",
    modeText: "Text only",
    modeChords: "Chords only",
    modeBoth: "Text with chords",
    key: "Key",
    transposeDown: "Transpose down",
    transposeUp: "Transpose up",
    resetKey: "Reset key",
    keyHint: "Changes only how you see the song. The song itself stays the same.",
    stageMode: "Stage mode",
    language: { uk: "Ukrainian", en: "English" },
  },
  stage: {
    close: "Close stage mode",
    smaller: "Smaller text",
    larger: "Larger text",
    transposeDown: "Transpose down",
    transposeUp: "Transpose up",
    key: "Key",
    speed: "Speed",
    play: "Start auto-scroll",
    pause: "Pause auto-scroll",
    tapHint: "Tap the text to pause or resume. Bars hide while scrolling.",
  },
  errors: {
    notFound: "Page not found",
    notFoundHint: "The page you are looking for does not exist.",
    toSongs: "Back to songs",
  },
};

export type Dictionary = typeof en;

const uk: Dictionary = {
  appName: "Лад",
  nav: { songs: "Пісні", main: "Головна навігація" },
  language: { label: "Мова", en: "English", uk: "Українська" },
  catalog: {
    title: "Пісні",
    searchLabel: "Пошук пісень",
    searchPlaceholder: "Назва або виконавець",
    searchButton: "Шукати",
    empty: "Пісень не знайдено.",
    emptyHint: "Спробуй іншу назву чи виконавця.",
    count: "пісень",
    key: "Тональність",
  },
  song: {
    back: "Пісні",
    notFound: "Пісню не знайдено",
    notFoundHint: "Можливо, її видалили з каталогу.",
    display: "Відображення",
    modeText: "Лише текст",
    modeChords: "Лише акорди",
    modeBoth: "Текст з акордами",
    key: "Тональність",
    transposeDown: "Нижче",
    transposeUp: "Вище",
    resetKey: "Скинути тональність",
    keyHint: "Змінює лише те, як ти бачиш пісню. Сама пісня не змінюється.",
    stageMode: "Режим сцени",
    language: { uk: "Українська", en: "Англійська" },
  },
  stage: {
    close: "Закрити режим сцени",
    smaller: "Менший текст",
    larger: "Більший текст",
    transposeDown: "Нижче",
    transposeUp: "Вище",
    key: "Тональність",
    speed: "Швидкість",
    play: "Увімкнути автопрокрутку",
    pause: "Пауза автопрокрутки",
    tapHint: "Торкнись тексту, щоб поставити на паузу чи продовжити. Панелі ховаються під час прокрутки.",
  },
  errors: {
    notFound: "Сторінку не знайдено",
    notFoundHint: "Такої сторінки не існує.",
    toSongs: "До списку пісень",
  },
};

export const dictionaries: Record<Locale, Dictionary> = { en, uk };

export function isLocale(value: string | undefined | null): value is Locale {
  return value === "en" || value === "uk";
}
