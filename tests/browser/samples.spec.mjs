import { test, expect } from "@playwright/test";
import fs from "node:fs";

for (const es of [false, true]) {
  for (const width of [390, 1280]) {
    test(`${es ? "ES" : "EN"} ${width}px: real samples open, close and preserve keyboard focus`, async ({
      page,
    }) => {
      await page.setViewportSize({ width, height: 900 });
      await page.goto(es ? "/book_es_04.html" : "/book_en_04.html");
      const samples = page.locator("[data-preview]");
      await expect(samples).toHaveCount(3);
      const trigger = samples.nth(1);
      await trigger.click();
      const dialog = page.getByRole("dialog");
      await expect(dialog).toBeVisible();
      await expect(dialog.locator("img")).toHaveAttribute(
        "src",
        /talking-with-dad-1440.webp$/,
      );
      await expect
        .poll(() =>
          dialog
            .locator("img")
            .evaluate((image) => image.complete && image.naturalWidth > 0),
        )
        .toBe(true);
      await page.keyboard.press("Escape");
      await expect(dialog).not.toBeVisible();
      await expect(trigger).toBeFocused();
      await samples.first().click();
      await dialog.getByRole("button").click();
      await expect(dialog).not.toBeVisible();
      const reading = page.locator(".sample-reading");
      await reading.locator("summary").click();
      await expect(reading.locator("blockquote")).toContainText(
        es
          ? "Estamos ahorrando para estar listos"
          : "We’re saving so we’re ready",
      );
      expect(
        await page.evaluate(
          () => document.documentElement.scrollWidth <= innerWidth,
        ),
      ).toBe(true);
      const events = await page.evaluate(() =>
        window.dataLayer
          .filter((item) => item[0] === "event")
          .map((item) => item[1]),
      );
      expect(events).toContain("sample_open");
      expect(events).toContain("sample_read");
      fs.mkdirSync("artifacts", { recursive: true });
      await page
        .locator("#inside")
        .screenshot({
          path: `artifacts/samples-${es ? "es" : "en"}-${width}.png`,
        });
    });
  }
}

test("Spanish pages show the supplied Spanish cover", async ({ page }) => {
  for (const url of ["/es/", "/book_es_04.html"]) {
    await page.goto(url);
    const cover = page.locator(".hero .cover img");
    await expect(cover).toHaveAttribute(
      "src",
      "/images/portada-listo-para-la-lluvia.webp",
    );
    await expect(cover).toHaveAttribute("alt", /Portada en español/);
    await expect
      .poll(() =>
        cover.evaluate((image) => image.complete && image.naturalWidth > 0),
      )
      .toBe(true);
    await expect(page.locator(".hero .cover figcaption")).not.toContainText(
      "edición en inglés",
    );
  }
});

test("sample images have a usable fallback when JavaScript is disabled", async ({
  browser,
}) => {
  const context = await browser.newContext({ javaScriptEnabled: false });
  const page = await context.newPage();
  await page.goto("http://127.0.0.1:4173/book_es_04.html");
  const link = page.locator("[data-preview]").first();
  await link.click();
  await expect(page).toHaveURL(/leo-and-the-jar-1440.webp$/);
  await context.close();
});
