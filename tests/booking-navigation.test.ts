import test from "node:test";
import assert from "node:assert/strict";
import { safeReturnPath } from "../src/components/booking/api.js";

test("login returns only to local booking routes and preserves selected package", () => {
  assert.equal(
    safeReturnPath("/book?package=wedding"),
    "/book?package=wedding",
  );
  assert.equal(safeReturnPath("/client/bookings/abc"), "/client/bookings/abc");
  assert.equal(safeReturnPath("/admin"), "/admin");
  for (const unsafe of [
    "//evil.test",
    "/\t/evil.test",
    "https://evil.test",
    "/\\evil.test",
    "/client/../../login",
    "javascript:alert(1)",
    "/login?next=/admin",
  ]) {
    assert.equal(safeReturnPath(unsafe), "/client");
  }
});
