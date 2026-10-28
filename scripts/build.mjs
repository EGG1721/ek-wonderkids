import { mkdir, readdir, copyFile, cp } from "node:fs/promises";
import path from "node:path";
import { assertBuildAllowed } from "./deployment-policy.mjs";

assertBuildAllowed();

// Allowlist: internal files, local databases and credentials never become assets.
const output = path.resolve("dist");
if (output !== path.join(process.cwd(), "dist"))
  throw new Error("Unexpected output path");
await mkdir(output, { recursive: true });
for (const entry of await readdir(".")) {
  if (
    entry.endsWith(".html") ||
    ["robots.txt", "sitemap.xml", "_headers", "_redirects"].includes(entry)
  ) {
    await copyFile(entry, path.join(output, entry));
  }
}
for (const directory of ["es", "css", "js", "images"]) {
  await cp(directory, path.join(output, directory), { recursive: true });
}
console.log("Public assets built in dist/");
