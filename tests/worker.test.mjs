import { test } from "node:test";
import assert from "node:assert/strict";
import { DatabaseSync } from "node:sqlite";
import fs from "node:fs";
import worker from "../src/index.js";

const TOKEN = "8c5ee53c-3c31-4c28-9e33-083416479bc1";
function fixture(
  t,
  { missing = false, limited = false, legacy = false, mailStatus = 200 } = {},
) {
  const sqlite = new DatabaseSync(":memory:");
  sqlite.exec(fs.readFileSync("schema.sql", "utf8"));
  sqlite.exec(fs.readFileSync("schema_newsletter.sql", "utf8"));
  if (!legacy)
    sqlite.exec(fs.readFileSync("migration_add_language.sql", "utf8"));
  t.after(() => sqlite.close());
  let sends = 0;
  t.mock.method(globalThis, "fetch", async () => {
    sends++;
    return new Response("{}", { status: mailStatus });
  });
  const env = {
    DB: {
      prepare(sql) {
        return {
          bind(...args) {
            this.args = args;
            return this;
          },
          async run() {
            return {
              meta: {
                changes: Number(sqlite.prepare(sql).run(...this.args).changes),
              },
            };
          },
          async first() {
            return sqlite.prepare(sql).get(...this.args) || null;
          },
        };
      },
    },
    RESOURCES: {
      async head() {
        return missing ? null : { size: 10 };
      },
      async get() {
        return missing
          ? null
          : {
              body: "%PDF-1.4 test",
              writeHttpMetadata(h) {
                h.set("Content-Type", "application/pdf");
              },
            };
      },
    },
    SUBSCRIBE_LIMITER: {
      async limit() {
        return { success: !limited };
      },
    },
    ASSETS: {
      async fetch() {
        return new Response("asset");
      },
    },
    RESEND_API_KEY: "test-only",
    FROM_EMAIL: "test@example.test",
    FROM_EMAIL_NEWSLETTER: "test@example.test",
  };
  return { env, sqlite, sends: () => sends };
}
function request(data = {}, headers = {}) {
  return new Request("https://example.test/api/subscribe", {
    method: "POST",
    headers: { "Content-Type": "application/json", ...headers },
    body: JSON.stringify({
      name: "Parent",
      email: "parent@example.test",
      book: "book_es_04",
      language: "es",
      ...data,
    }),
  });
}
test("stores the lead in real SQLite, reports email acceptance, and escapes submitted HTML", async (t) => {
  const f = fixture(t);
  let mail;
  t.mock.method(globalThis, "fetch", async (_, options) => {
    mail = JSON.parse(options.body);
    return new Response("{}");
  });
  const res = await worker.fetch(request({ name: "<Parent>" }), f.env);
  const result = await res.json();
  assert.equal(res.status, 200);
  assert.equal(result.emailStatus, "accepted");
  assert.match(result.downloadUrl, /\/api\/download\?token=/);
  assert.equal(
    f.sqlite.prepare("SELECT language,email_sent FROM leads").get().email_sent,
    1,
  );
  assert.match(mail.html, /&lt;Parent&gt;/);
  assert.doesNotMatch(mail.html, /<Parent>/);
});
test("provider failure keeps direct download and does not claim accepted mail", async (t) => {
  const f = fixture(t, { mailStatus: 503 });
  const res = await worker.fetch(request(), f.env);
  const data = await res.json();
  assert.equal(data.success, true);
  assert.equal(data.emailStatus, "failed");
  assert.ok(data.downloadUrl);
  assert.equal(
    f.sqlite.prepare("SELECT email_sent FROM leads").get().email_sent,
    0,
  );
});
test("missing credentials preserve direct download without attempting an email", async (t) => {
  const f = fixture(t);
  delete f.env.RESEND_API_KEY;
  assert.equal(
    (await (await worker.fetch(request(), f.env)).json()).emailStatus,
    "failed",
  );
  assert.equal(f.sends(), 0);
});
test("legacy schema works until the language migration is applied", async (t) => {
  const f = fixture(t, { legacy: true });
  assert.equal((await worker.fetch(request(), f.env)).status, 200);
});
test("missing PDF prevents lead collection and email", async (t) => {
  const f = fixture(t, { missing: true });
  assert.equal((await worker.fetch(request(), f.env)).status, 503);
  assert.equal(f.sqlite.prepare("SELECT COUNT(*) AS n FROM leads").get().n, 0);
  assert.equal(f.sends(), 0);
});
for (const [label, data] of [
  ["inherited resource", { book: "constructor" }],
  ["prototype resource", { book: "__proto__" }],
  ["object name", { name: {} }],
  ["long name", { name: "a".repeat(101) }],
  ["invalid email", { email: "bad" }],
  ["wrong language", { language: "fr" }],
  ["honeypot", { website: "spam" }],
]) {
  test("rejects " + label, async (t) => {
    const f = fixture(t);
    assert.equal((await worker.fetch(request(data), f.env)).status, 400);
    assert.equal(f.sends(), 0);
  });
}
test("limits repeated email requests and platform-limited requests", async (t) => {
  const f = fixture(t);
  assert.equal((await worker.fetch(request(), f.env)).status, 200);
  const repeat = await worker.fetch(request(), f.env);
  assert.equal(repeat.status, 429);
  assert.equal(repeat.headers.get("Retry-After"), "60");
  assert.equal(f.sends(), 1);
  f.env.SUBSCRIBE_LIMITER.limit = async () => ({ success: false });
  assert.equal(
    (await worker.fetch(request({ email: "other@example.test" }), f.env))
      .status,
    429,
  );
});
test("rejects oversized and malformed bodies and cross-origin posts", async (t) => {
  const f = fixture(t);
  assert.equal(
    (await worker.fetch(request({ name: "x".repeat(5000) }), f.env)).status,
    413,
  );
  assert.equal(
    (
      await worker.fetch(
        new Request("https://example.test/api/subscribe", {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: "{",
        }),
        f.env,
      )
    ).status,
    400,
  );
  assert.equal(
    (await worker.fetch(request({}, { Origin: "https://other.test" }), f.env))
      .status,
    403,
  );
});
test("download can be repeated within seven days, records first access and never caches", async (t) => {
  const f = fixture(t);
  f.sqlite
    .prepare(
      "INSERT INTO leads(name,email,book,resource_key,token) VALUES (?,?,?,?,?)",
    )
    .run("Parent", "parent@example.test", "book_en_04", "test.pdf", TOKEN);
  for (let i = 0; i < 2; i++) {
    const res = await worker.fetch(
      new Request("https://example.test/api/download?token=" + TOKEN),
      f.env,
    );
    assert.equal(res.status, 200);
    assert.equal(res.headers.get("Cache-Control"), "private, no-store");
    assert.match(await res.text(), /%PDF/);
  }
  assert.ok(
    f.sqlite.prepare("SELECT downloaded_at FROM leads").get().downloaded_at,
  );
});
test("expired and malformed download tokens cannot access resources", async (t) => {
  const f = fixture(t);
  f.sqlite
    .prepare(
      "INSERT INTO leads(name,email,book,resource_key,token,created_at) VALUES (?,?,?,?,?,datetime('now','-8 days'))",
    )
    .run("Parent", "parent@example.test", "book_en_04", "test.pdf", TOKEN);
  assert.equal(
    (
      await worker.fetch(
        new Request("https://example.test/api/download?token=" + TOKEN),
        f.env,
      )
    ).status,
    410,
  );
  assert.equal(
    (
      await worker.fetch(
        new Request("https://example.test/api/download?token=bad"),
        f.env,
      )
    ).status,
    400,
  );
});
test("legacy newsletter deduplicates registrations and reports mail status", async (t) => {
  const f = fixture(t);
  const make = () =>
    new Request("https://example.test/subscribe", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ email: "parent@example.test" }),
    });
  assert.equal(
    (await (await worker.fetch(make(), f.env)).json()).emailStatus,
    "accepted",
  );
  assert.equal(
    (await (await worker.fetch(make(), f.env)).json()).emailStatus,
    "not_requested",
  );
  assert.equal(f.sends(), 1);
});
test("unsupported API methods are explicit; public assets still work", async (t) => {
  const f = fixture(t);
  assert.equal(
    (
      await worker.fetch(
        new Request("https://example.test/api/subscribe"),
        f.env,
      )
    ).status,
    405,
  );
  assert.equal(
    await (
      await worker.fetch(new Request("https://example.test/"), f.env)
    ).text(),
    "asset",
  );
});
