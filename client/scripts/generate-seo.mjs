import fs from "fs";
import path from "path";

const DEFAULT_SITE_URL = "https://smm-admin-panel-fron-production.up.railway.app";
const SITE_URL = normalizeSiteUrl(process.env.VITE_SITE_URL || DEFAULT_SITE_URL);
const TITLE = "aloo SMM Panel";
const DESCRIPTION = "SMM va marketing boshqaruv tizimi";

function normalizeSiteUrl(value) {
  const trimmed = String(value || "").trim();
  if (!trimmed) return DEFAULT_SITE_URL;
  return trimmed.endsWith("/") ? trimmed.slice(0, -1) : trimmed;
}

const rootDir = process.cwd();
const publicDir = path.join(rootDir, "public");

if (!fs.existsSync(publicDir)) {
  fs.mkdirSync(publicDir, { recursive: true });
}

const robotsTxt = `User-agent: *
Allow: /

Sitemap: ${SITE_URL}/sitemap.xml
`;

const sitemapXml = `<?xml version="1.0" encoding="UTF-8"?>
<urlset xmlns="http://www.sitemaps.org/schemas/sitemap/0.9">
  <url>
    <loc>${SITE_URL}/</loc>
    <changefreq>weekly</changefreq>
    <priority>1.0</priority>
  </url>
</urlset>
`;

const llmsTxt = `# ${TITLE}
> ${DESCRIPTION}

URL: ${SITE_URL}/
Summary: ${DESCRIPTION}
`;

fs.writeFileSync(path.join(publicDir, "robots.txt"), robotsTxt, "utf8");
fs.writeFileSync(path.join(publicDir, "sitemap.xml"), sitemapXml, "utf8");
fs.writeFileSync(path.join(publicDir, "llms.txt"), llmsTxt, "utf8");

console.log(`SEO files generated for ${SITE_URL}`);
