import assert from "node:assert/strict";
import { describe, it } from "node:test";
import { dictionaries, fmt } from "./dictionaries";

/** Усі ключі словника у вигляді шляхів: "auth.errors.expired". */
function paths(value: unknown, prefix = ""): string[] {
  if (typeof value === "string") return [prefix];
  return Object.entries(value as Record<string, unknown>).flatMap(([key, child]) =>
    paths(child, prefix ? `${prefix}.${key}` : key),
  );
}

/** Плейсхолдери {name} у рядку. */
function placeholders(text: string): string[] {
  return [...text.matchAll(/\{(\w+)\}/g)].map((m) => m[1]).sort();
}

function get(dict: unknown, path: string): string {
  return path.split(".").reduce<unknown>((acc, key) => (acc as Record<string, unknown>)[key], dict) as string;
}

describe("словники EN і UK", () => {
  const enPaths = paths(dictionaries.en).sort();
  const ukPaths = paths(dictionaries.uk).sort();

  it("мають однакові ключі", () => {
    assert.deepEqual(ukPaths, enPaths);
  });

  it("не мають порожніх рядків", () => {
    for (const path of enPaths) {
      assert.notEqual(get(dictionaries.en, path).trim(), "", `en ${path}`);
      assert.notEqual(get(dictionaries.uk, path).trim(), "", `uk ${path}`);
    }
  });

  it("мають однакові плейсхолдери в обох мовах", () => {
    for (const path of enPaths) {
      assert.deepEqual(
        placeholders(get(dictionaries.uk, path)),
        placeholders(get(dictionaries.en, path)),
        path,
      );
    }
  });
});

describe("fmt", () => {
  it("підставляє значення", () => {
    assert.equal(fmt("{a} і {b}", { a: 1, b: "два" }), "1 і два");
  });

  it("лишає невідомий плейсхолдер як є", () => {
    assert.equal(fmt("Hi {name}", {}), "Hi {name}");
  });
});
