import assert from "node:assert/strict";
import { describe, it } from "node:test";
import {
  can,
  canGrantRole,
  canRevokeRole,
  isAdmin,
  isSuperAdminEmail,
  type Action,
  type Actor,
  type RoleRef,
} from "./permissions";

const member: Actor = { roles: ["member"], isSuperAdmin: false };
const bassist: Actor = { roles: ["member", "bassist", "vocalist"], isSuperAdmin: false };
const editor: Actor = { roles: ["member", "editor"], isSuperAdmin: false };
const admin: Actor = { roles: ["member", "admin"], isSuperAdmin: false };
const superAdmin: Actor = { roles: ["member"], isSuperAdmin: true };

const ACTIONS: Action[] = [
  "song:read",
  "song:write",
  "playlist:manage",
  "users:read",
  "roles:assign",
  "musicRoles:manage",
];

/** Очікувана матриця з lad-backend-spec.md, п. 2. */
const MATRIX: Record<string, Record<Action, boolean>> = {
  guest: {
    "song:read": true, "song:write": false, "playlist:manage": false,
    "users:read": false, "roles:assign": false, "musicRoles:manage": false,
  },
  member: {
    "song:read": true, "song:write": false, "playlist:manage": true,
    "users:read": false, "roles:assign": false, "musicRoles:manage": false,
  },
  bassist: {
    "song:read": true, "song:write": false, "playlist:manage": true,
    "users:read": false, "roles:assign": false, "musicRoles:manage": false,
  },
  editor: {
    "song:read": true, "song:write": true, "playlist:manage": true,
    "users:read": false, "roles:assign": false, "musicRoles:manage": false,
  },
  admin: {
    "song:read": true, "song:write": false, "playlist:manage": true,
    "users:read": true, "roles:assign": true, "musicRoles:manage": false,
  },
  superAdmin: {
    "song:read": true, "song:write": false, "playlist:manage": true,
    "users:read": true, "roles:assign": true, "musicRoles:manage": true,
  },
};

const actors: Record<string, Actor | null> = {
  guest: null, member, bassist, editor, admin, superAdmin,
};

describe("матриця прав", () => {
  for (const [name, actor] of Object.entries(actors)) {
    for (const action of ACTIONS) {
      it(`${name}: ${action} = ${MATRIX[name][action]}`, () => {
        assert.equal(can(actor, action), MATRIX[name][action]);
      });
    }
  }

  it("ролі не накопичувальні: адмін без ролі редактора не редагує пісні", () => {
    assert.equal(can(admin, "song:write"), false);
  });

  it("права кількох ролей складаються", () => {
    const both: Actor = { roles: ["member", "editor", "admin"], isSuperAdmin: false };
    assert.equal(can(both, "song:write"), true);
    assert.equal(can(both, "roles:assign"), true);
  });

  it("isAdmin: адмін і супер-адмін так, решта ні", () => {
    assert.equal(isAdmin(admin), true);
    assert.equal(isAdmin(superAdmin), true);
    assert.equal(isAdmin(editor), false);
    assert.equal(isAdmin(null), false);
  });
});

const roleMember: RoleRef = { key: "member", kind: "system", isRemovable: false };
const roleEditor: RoleRef = { key: "editor", kind: "system", isRemovable: true };
const roleAdmin: RoleRef = { key: "admin", kind: "system", isRemovable: true };
const roleBassist: RoleRef = { key: "bassist", kind: "music", isRemovable: true };
const regular = { isSuperAdmin: false };

describe("видача ролей", () => {
  it("адмін видає музичні ролі й Editor", () => {
    assert.deepEqual(canGrantRole(admin, roleBassist), { ok: true });
    assert.deepEqual(canGrantRole(admin, roleEditor), { ok: true });
  });

  it("роль Admin видає лише супер-адмін", () => {
    assert.deepEqual(canGrantRole(admin, roleAdmin), { ok: false, reason: "admin_super_only" });
    assert.deepEqual(canGrantRole(superAdmin, roleAdmin), { ok: true });
  });

  it("Member автоматична й не видається", () => {
    assert.deepEqual(canGrantRole(superAdmin, roleMember), {
      ok: false,
      reason: "member_is_automatic",
    });
  });

  it("не-адмін не видає нічого", () => {
    assert.deepEqual(canGrantRole(editor, roleBassist), { ok: false, reason: "not_admin" });
    assert.deepEqual(canGrantRole(null, roleBassist), { ok: false, reason: "not_admin" });
  });
});

describe("зняття ролей", () => {
  it("Member не знімається нікому, навіть супер-адміну", () => {
    assert.deepEqual(canRevokeRole(superAdmin, roleMember, regular), {
      ok: false,
      reason: "member_not_removable",
    });
  });

  it("адмін знімає музичні ролі й Editor", () => {
    assert.deepEqual(canRevokeRole(admin, roleBassist, regular), { ok: true });
    assert.deepEqual(canRevokeRole(admin, roleEditor, regular), { ok: true });
  });

  it("роль Admin знімає лише супер-адмін", () => {
    assert.deepEqual(canRevokeRole(admin, roleAdmin, regular), {
      ok: false,
      reason: "admin_super_only",
    });
    assert.deepEqual(canRevokeRole(superAdmin, roleAdmin, regular), { ok: true });
  });

  it("з супер-адміна роль Admin зняти не можна нікому", () => {
    assert.deepEqual(canRevokeRole(superAdmin, roleAdmin, { isSuperAdmin: true }), {
      ok: false,
      reason: "super_admin_locked",
    });
  });

  it("не-адмін не знімає нічого", () => {
    assert.deepEqual(canRevokeRole(member, roleBassist, regular), { ok: false, reason: "not_admin" });
  });
});

describe("супер-адмін із .env", () => {
  it("збіг без урахування регістру й пробілів", () => {
    assert.equal(isSuperAdminEmail("Boss@Example.com ", "boss@example.com"), true);
  });

  it("кілька адрес через кому", () => {
    assert.equal(isSuperAdminEmail("b@x.com", "a@x.com, b@x.com"), true);
    assert.equal(isSuperAdminEmail("c@x.com", "a@x.com, b@x.com"), false);
  });

  it("порожня або відсутня змінна не дає прав нікому", () => {
    assert.equal(isSuperAdminEmail("a@x.com", undefined), false);
    assert.equal(isSuperAdminEmail("a@x.com", ""), false);
    assert.equal(isSuperAdminEmail("", ","), false);
  });
});
