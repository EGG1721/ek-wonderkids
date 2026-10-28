import { test } from "node:test";
import assert from "node:assert/strict";
import { assertBuildAllowed } from "../scripts/deployment-policy.mjs";

test("local builds and GitHub checks can validate without publishing", () => {
  assert.doesNotThrow(() => assertBuildAllowed({}));
  assert.doesNotThrow(() => assertBuildAllowed({ CI: "true" }));
});
test("Cloudflare work branches stop before building public assets", () => {
  assert.throws(
    () =>
      assertBuildAllowed({
        WORKERS_CI: "1",
        WORKERS_CI_BRANCH: "fix/conversion-foundation",
      }),
    /Publication stopped/,
  );
});
test("unknown Cloudflare branches fail closed", () => {
  assert.throws(
    () => assertBuildAllowed({ WORKERS_CI: "1" }),
    /Publication stopped/,
  );
});
test("reviewed main builds remain possible", () => {
  assert.doesNotThrow(() =>
    assertBuildAllowed({ WORKERS_CI: "1", WORKERS_CI_BRANCH: "main" }),
  );
});
