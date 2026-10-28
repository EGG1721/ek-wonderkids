import fs from "node:fs";
import sharp from "sharp";
const pages = [
  ...fs.readdirSync(".").filter((p) => p.endsWith(".html")),
  ...fs
    .readdirSync("es")
    .filter((p) => p.endsWith(".html"))
    .map((p) => "es/" + p),
];
const images = new Map();
let before = 0,
  after = 0;
for (const page of pages) {
  let html = fs.readFileSync(page, "utf8");
  const tags = [
    ...html.matchAll(/<img\b[^>]*src="(\/images\/[^"<>]+)"[^>]*>/g),
  ];
  for (const [tag, src] of tags) {
    if (!/\.(png|jpg)$/i.test(src)) continue;
    if (!images.has(src)) {
      const original = decodeURIComponent(src.slice(1));
      const metadata = await sharp(original).metadata();
      const output = original.replace(/\.(png|jpg)$/i, ".webp");
      await sharp(original)
        .resize({ width: 900, withoutEnlargement: true })
        .webp({ quality: 82 })
        .toFile(output);
      const optimized = await sharp(output).metadata();
      images.set(src, {
        output: "/" + output,
        width: optimized.width,
        height: optimized.height,
      });
      before += fs.statSync(original).size;
      after += fs.statSync(output).size;
    }
    const image = images.get(src);
    let next = tag
      .replace(src, image.output)
      .replace(/\s(?:width|height)="[^"]*"/g, "");
    next = next.replace(
      /\s*\/?>$/,
      ` width="${image.width}" height="${image.height}" decoding="async"${/loading=|fetchpriority=/.test(next) ? "" : ' loading="lazy"'}>`,
    );
    html = html.replace(tag, next);
  }
  fs.writeFileSync(page, html);
}
console.log(
  JSON.stringify({
    images: images.size,
    originalBytes: before,
    optimizedBytes: after,
    reductionPercent: Math.round((1 - after / before) * 100),
  }),
);
