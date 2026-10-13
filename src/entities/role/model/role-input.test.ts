import assert from "node:assert/strict";
import { describe, it } from "node:test";
import { cleanName, isValidRoleKey } from "./role-input";

describe("ключ ролі", () => {
  it("приймає малі латинські літери, цифри, дефіс і підкреслення", () => {
    assert.equal(isValidRoleKey("drummer"), true);
    assert.equal(isValidRoleKey("lead-guitar"), true);
    assert.equal(isValidRoleKey("sound_2"), true);
  });

  it("відкидає хибні ключі", () => {
    assert.equal(isValidRoleKey("Drummer"), false);
    assert.equal(isValidRoleKey("1drum"), false);
    assert.equal(isValidRoleKey("a"), false);
    assert.equal(isValidRoleKey("has space"), false);
    assert.equal(isValidRoleKey("x".repeat(31)), false);
    assert.equal(isValidRoleKey(""), false);
    assert.equal(isValidRoleKey(42), false);
  });

  it("не дозволяє зарезервовані системні ключі", () => {
    for (const key of ["member", "editor", "admin", "guest"]) {
      assert.equal(isValidRoleKey(key), false);
    }
  });
});

describe("назва ролі", () => {
  it("обрізає пробіли", () => {
    assert.equal(cleanName("  Барабанщик "), "Барабанщик");
  });

  it("відкидає порожню, задовгу й не рядок", () => {
    assert.equal(cleanName("   "), null);
    assert.equal(cleanName("x".repeat(61)), null);
    assert.equal(cleanName(null), null);
  });
});
