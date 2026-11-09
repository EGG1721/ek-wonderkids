import { test, expect } from "@playwright/test";

test("language keeps sample and resource anchors after hash navigation", async ({
  page,
}) => {
  await page.goto("/book_es_04.html#resource");
  await page.locator("a.language").click();
  await expect(page).toHaveURL(/book_en_04.html#resource/);
  await page.locator("[data-cta=hero_inside]").click();
  await page.locator("a.language").click();
  await expect(page).toHaveURL(/book_es_04.html#inside/);
});

test("optional name, useful next step, accurate lead event and PDF retry", async ({
  page,
}) => {
  await page.route("**/api/subscribe", (route) => {
    expect(route.request().postDataJSON().name).toBe("");
    return route.fulfill({
      json: {
        success: true,
        emailStatus: "accepted",
        downloadUrl: "/api/download?token=test",
      },
    });
  });
  await page.route("**/api/download?*", (route) =>
    route.fulfill({ status: 503, body: "try later" }),
  );
  await page.goto("/book_es_04.html#resource");
  await page.locator("input[name=email]").fill("parent@example.test");
  await page.locator("form button[type=submit]").click();
  await expect(page.locator(".resource-status")).toContainText(
    "intentar de nuevo",
  );
  await expect(page.locator("[data-cta=resource_next_story]")).toHaveAttribute(
    "href",
    "/book_es_04.html#inside",
  );
  const events = await page.evaluate(() =>
    window.dataLayer
      .filter((e) => e[0] === "event")
      .map((e) => ({ name: e[1], data: e[2] })),
  );
  expect(events.filter((e) => e.name === "resource_form_start")).toHaveLength(
    1,
  );
  expect(
    events.filter((e) => e.name === "resource_request_success"),
  ).toHaveLength(1);
  expect(events.map((e) => e.name)).not.toContain("email_signup");
  expect(events.map((e) => e.name)).not.toContain("resource_received");
  expect(JSON.stringify(events)).not.toContain("parent@example.test");
});

for (const width of [390, 1280])
  for (const url of [
    "/activities.html",
    "/es/actividades.html",
    "/talking-about-money.html",
    "/es/hablar-de-dinero.html",
    "/saving-activity.html",
    "/es/actividad-de-ahorro.html",
    "/family-questions.html",
    "/es/preguntas-en-familia.html",
  ]) {
    test(`${width}px ${url}: complete activity and paired language`, async ({
      page,
    }) => {
      await page.setViewportSize({ width, height: 850 });
      await page.goto(url);
      await expect(page.locator("h1")).toBeVisible();
      expect(
        await page.evaluate(
          () => document.documentElement.scrollWidth <= innerWidth,
        ),
      ).toBe(true);
      await expect(page.locator("[data-cta=activity_story]")).toHaveAttribute(
        "href",
        /book_(en|es)_04.html#inside/,
      );
      await page.locator("a.language").click();
      await expect(page.locator("h1")).toBeVisible();
    });
  }
