import fs from "fs";
import path from "path";

const rootDir = process.cwd();
const distDir = path.join(rootDir, "dist");
const indexFile = path.join(distDir, "index.html");
const fallbackFiles = ["404.html", "200.html"];
const redirectsFile = path.join(distDir, "_redirects");

if (!fs.existsSync(indexFile)) {
  console.error("dist/index.html topilmadi. Avval build ishlating.");
  process.exit(1);
}

const html = fs.readFileSync(indexFile, "utf8");

for (const fileName of fallbackFiles) {
  fs.writeFileSync(path.join(distDir, fileName), html, "utf8");
}

fs.writeFileSync(redirectsFile, "/* /index.html 200\n", "utf8");

console.log("SPA fallback files generated:", fallbackFiles.join(", "), "_redirects");
