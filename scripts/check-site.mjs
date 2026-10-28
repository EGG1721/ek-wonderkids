import fs from "node:fs";
import path from "node:path";
const pages = [
  ...fs.readdirSync(".").filter((p) => p.endsWith(".html")),
  ...fs
    .readdirSync("es")
    .filter((p) => p.endsWith(".html"))
    .map((p) => "es/" + p),
];
const failures = [];
for (const page of pages) {
  const html = fs.readFileSync(page, "utf8");
  if (/G-XXXXXXXXXX|free_resource_download/.test(html))
    failures.push(page + ": obsolete analytics");
  if (/href="#"[^>]*>[^<]*Amazon/.test(html))
    failures.push(page + ": empty Amazon link");
  for (const match of html.matchAll(/(?:href|src)="([^"<>]+)"/g)) {
    const link = match[1];
    if (/^(https?:|data:|mailto:|javascript:)/.test(link)) continue;
    const [raw, anchor] = link.split("#");
    const target = raw
      ? raw.startsWith("/")
        ? raw.slice(1)
        : path.join(path.dirname(page), raw)
      : page;
    const file = !target
      ? "index.html"
      : target.endsWith("/")
        ? target + "index.html"
        : target;
    if (!fs.existsSync(decodeURIComponent(file)))
      failures.push(page + ": missing " + link);
    else if (
      anchor &&
      file.endsWith(".html") &&
      !new RegExp('id=["\x27]' + anchor + '["\x27]').test(
        fs.readFileSync(file, "utf8"),
      )
    )
      failures.push(page + ": missing anchor " + link);
  }
  for (const script of html.matchAll(
    /<script type="application\/ld\+json">([\s\S]*?)<\/script>/g,
  )) {
    try {
      JSON.parse(script[1]);
    } catch {
      failures.push(page + ": invalid structured data");
    }
  }
}
if (failures.length) {
  console.error(failures.join("\n"));
  process.exitCode = 1;
} else
  console.log(
    "All " +
      pages.length +
      " pages: local links, anchors and metadata checks passed.",
  );
