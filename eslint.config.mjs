// @ts-check
import boundaries from "eslint-plugin-boundaries";
import tseslint from "typescript-eslint";

/**
 * Архітектурні межі Feature-Sliced Design (див. README, розділ «Архітектура»).
 *
 * Шари зверху вниз: app → views → widgets → features → entities → shared.
 * `server` це серверний шар поза FSD (БД, сесії, пошта): його використовують
 * app, views і features (серверні дії), а сам він залежить лише від entities і shared.
 *
 * Правила для слайсів (views, widgets, features, entities):
 *  - імпорт лише вниз по шарах (default: disallow);
 *  - слайси одного шару не імпортують один одного;
 *  - ззовні слайс доступний тільки через `index.ts`.
 * Внутрішні імпорти всередині одного елемента плагін не перевіряє.
 */

const LAYER_RULES = [
  { from: "app", allow: ["views", "widgets", "features", "entities", "shared", "server"] },
  { from: "views", allow: ["widgets", "features", "entities", "shared", "server"] },
  { from: "widgets", allow: ["features", "entities", "shared"] },
  { from: "features", allow: ["entities", "shared", "server"] },
  { from: "entities", allow: ["shared"] },
  { from: "server", allow: ["entities", "shared"] },
  // shared нічого не імпортує з інших шарів: це покриває `default: "disallow"`
];

export default [
  {
    ignores: [".next/**", "node_modules/**", "next-env.d.ts", "prisma/**", "*.config.*"],
  },
  {
    files: ["src/**/*.{ts,tsx}"],
    languageOptions: {
      parser: tseslint.parser,
      parserOptions: { ecmaFeatures: { jsx: true } },
    },
    plugins: { boundaries },
    settings: {
      // щоб плагін розумів аліас `@/*` з tsconfig.json
      "import/resolver": {
        typescript: { alwaysTryTypes: true, project: "./tsconfig.json" },
      },
      "boundaries/include": ["src/**/*"],
      "boundaries/elements": [
        { type: "app", pattern: "src/app", mode: "folder" },
        { type: "views", pattern: "src/views/*", mode: "folder", capture: ["slice"] },
        { type: "widgets", pattern: "src/widgets/*", mode: "folder", capture: ["slice"] },
        { type: "features", pattern: "src/features/*", mode: "folder", capture: ["slice"] },
        { type: "entities", pattern: "src/entities/*", mode: "folder", capture: ["slice"] },
        { type: "shared", pattern: "src/shared", mode: "folder" },
        { type: "server", pattern: "src/server", mode: "folder" },
      ],
    },
    rules: {
      "boundaries/element-types": [
        "error",
        {
          default: "disallow",
          message:
            "Порушено межі FSD: імпорт можливий лише вниз по шарах, слайси одного шару не імпортують один одного.",
          rules: LAYER_RULES,
        },
      ],
      "boundaries/entry-point": [
        "error",
        {
          default: "disallow",
          message: "Імпортуй слайс через його публічний API (index.ts), а не через внутрішній файл.",
          rules: [
            { target: ["views", "widgets", "features", "entities"], allow: "index.{ts,tsx}" },
            // shared і server не мають слайсів: з них можна імпортувати будь-який файл
            { target: ["shared", "server"], allow: "**" },
          ],
        },
      ],
    },
  },
];
