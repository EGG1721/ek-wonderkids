import { test, expect } from "@playwright/test";
import fs from "node:fs";

const pages = [
  "/",
  "/es/",
  "/book_en_04.html",
  "/book_es_04.html",
  "/book01.html",
  "/book02.html",
  "/book03.html",
  "/seeds-of-wealth.html",
  "/privacy.html",
  "/es/privacy.html",
];
for (const width of [390, 1280]) {
  for (const url of pages) {
    test(`${width}px ${url}: loads without errors or horizontal overflow`, async ({
      page,
    }) => {
      await page.setViewportSize({ width, height: 850 });
      const errors = [];
      page.on("pageerror", (e) => errors.push(e.message));
      await page.route("https://fonts.googleapis.com/**", (route) =>
        route.abort(),
      );
      await page.goto(url);
      await expect(page.locator("h1")).toBeVisible();
      expect(
        await page.evaluate(
          () => document.documentElement.scrollWidth <= innerWidth,
        ),
      ).toBe(true);
      expect(errors).toEqual([]);
    });
  }
}
for (const url of [
  "/book_en_04.html",
  "/book_es_04.html",
  "/book01.html",
  "/book02.html",
  "/book03.html",
]) {
  test(`${url}: failed email still downloads PDF without analytics dependency`, async ({
    page,
  }) => {
    const errors = [];
    page.on("pageerror", (e) => errors.push(e.message));
    await page.route("**/api/subscribe", async (route) => {
      const data = route.request().postDataJSON();
      expect(data.name).toBe("Parent");
      expect(data.email).toBe("parent@example.test");
      await route.fulfill({
        json: {
          success: true,
          emailStatus: "failed",
          downloadUrl: "/api/download?token=test",
        },
      });
    });
    await page.route("**/api/download?*", (route) =>
      route.fulfill({ contentType: "application/pdf", body: "%PDF-1.4 test" }),
    );
    await page.goto(url);
    await page.evaluate(() => {
      window.gtag = () => {
        throw new Error("Analytics unavailable");
      };
    });
    const form = page.locator("form").first();
    await form.locator("[name=name]").fill("Parent");
    await form.locator("[name=email]").fill("parent@example.test");
    await form.locator("button[type=submit]").click();
    await expect(page.locator(".resource-status").first()).toContainText(
      /could not send|pudimos enviar/,
    );
    await expect(page.locator(".resource-status").first()).toContainText(/PDF/);
    await expect(page.locator(".resource-download").first()).toBeEnabled();
    expect(errors).toEqual([]);
  });
}
test("failed download offers retry; registration does not count as a received PDF", async ({
  page,
}) => {
  let attempts = 0;
  await page.route("**/api/subscribe", (route) =>
    route.fulfill({
      json: {
        success: true,
        emailStatus: "accepted",
        downloadUrl: "/api/download?token=test",
      },
    }),
  );
  await page.route("**/api/download?*", (route) => {
    attempts++;
    return route.fulfill(
      attempts === 1
        ? { status: 503, body: "unavailable" }
        : { contentType: "application/pdf", body: "%PDF-1.4 test" },
    );
  });
  await page.goto("/book_es_04.html");
  const form = page.locator("form").first();
  await form.locator("[name=name]").fill("Parent");
  await form.locator("[name=email]").fill("parent@example.test");
  await form.locator("button").click();
  await expect(page.locator(".resource-status")).toContainText(
    "intentar de nuevo",
  );
  let events = await page.evaluate(() => window.dataLayer.map((e) => e[1]));
  expect(events).not.toContain("resource_received");
  await page.locator(".resource-download").click();
  await expect(page.locator(".resource-status")).toContainText(
    "PDF se ha recibido",
  );
  events = await page.evaluate(() => window.dataLayer.map((e) => e[1]));
  expect(events).toContain("resource_received");
});
test("rate limit preserves entered information and re-enables submit", async ({
  page,
}) => {
  await page.route("**/api/subscribe", (route) =>
    route.fulfill({ status: 429, json: { error: "too_many_requests" } }),
  );
  await page.goto("/book_es_04.html");
  const form = page.locator("form").first();
  await form.locator("[name=name]").fill("Parent");
  await form.locator("[name=email]").fill("parent@example.test");
  await form.locator("button").click();
  await expect(page.locator(".resource-status")).toContainText(
    "Espera un minuto",
  );
  await expect(form.locator("button")).toBeEnabled();
  await expect(form.locator("[name=email]")).toHaveValue("parent@example.test");
});
test("hook variant changes headline and measurement without storing personal data", async ({
  page,
}) => {
  await page.goto("/es/?hook=jar");
  await expect(page.locator("h1")).toContainText("Un frasco. Un cuento.");
  await page.locator("[data-cta=hero_book]").click();
  const events = await page.evaluate(() =>
    window.dataLayer
      .filter((e) => e[0] === "event")
      .map((e) => ({ name: e[1], data: e[2] })),
  );
  expect(
    events.some((e) => e.name === "cta_click" && e.data.hook_variant === "jar"),
  ).toBe(true);
  expect(JSON.stringify(events)).not.toContain("email");
});
test("capture review screenshots", async ({ page }) => {
  fs.mkdirSync("artifacts", { recursive: true });
  for (const [name, url, width] of [
    ["home-es-mobile", "/es/", 390],
    ["home-es-desktop", "/es/", 1280],
    ["resource-es-mobile", "/book_es_04.html", 390],
    ["resource-en-desktop", "/book_en_04.html", 1280],
  ]) {
    await page.setViewportSize({ width, height: 900 });
    await page.goto(url);
    for (const image of await page.locator("img").all()) {
      await image.scrollIntoViewIfNeeded();
      await expect
        .poll(() =>
          image.evaluate(
            (element) => element.complete && element.naturalWidth > 0,
          ),
        )
        .toBe(true);
    }
    await page.evaluate(() => scrollTo({ top: 0, behavior: "instant" }));
    await page.screenshot({
      path: "artifacts/" + name + ".png",
      fullPage: true,
    });
    if (name === "home-es-desktop")
      await page.screenshot({ path: "artifacts/home-es-first-screen.png" });
  }
});
