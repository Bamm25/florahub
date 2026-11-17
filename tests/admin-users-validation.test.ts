import assert from "node:assert/strict";
import { test } from "node:test";
import { updateUserSchema } from "../lib/validations/schemas";

test("Perubahan status wajib memiliki alasan terkontrol", () => {
  assert.equal(
    updateUserSchema.parse({ isActive: false, reasonCode: "POLICY_VIOLATION" }).isActive,
    false,
  );
  assert.equal(updateUserSchema.safeParse({ isActive: false }).success, false);
  assert.equal(
    updateUserSchema.safeParse({ isActive: false, reasonCode: "email pengguna" }).success,
    false,
  );
});

test("Form status tidak menerima perubahan role maupun identitas", () => {
  for (const field of ["role", "name", "email", "phone", "password"] as const) {
    assert.equal(
      updateUserSchema.safeParse({ isActive: true, reasonCode: "USER_REQUEST", [field]: "nilai" }).success,
      false,
    );
  }
  assert.equal(
    updateUserSchema.safeParse({ role: "ADMIN", isActive: false, reasonCode: "POLICY_VIOLATION" }).success,
    false,
  );
});

test("Permintaan tanpa status baru ditolak", () => {
  assert.equal(updateUserSchema.safeParse({ reasonCode: "USER_REQUEST" }).success, false);
});
