import fs from "fs";
import path from "path";

const DEFAULT_SITE_URL = "https://smm-admin-panel-fron-production.up.railway.app";
const SITE_URL = normalizeSiteUrl(process.env.VITE_SITE_URL || DEFAULT_SITE_URL);
const TITLE = "aloo SMM Panel";
const DESCRIPTION = "SMM va marketing boshqaruv tizimi";
const BUILD_DATE = new Date().toISOString().slice(0, 10);
const SITEMAP_ROUTES = [
  { path: "/", changefreq: "daily", priority: "1.0" },
  { path: "/login", changefreq: "monthly", priority: "0.9" },
  { path: "/menu", changefreq: "daily", priority: "0.95" },
  { path: "/kontent", changefreq: "daily", priority: "0.9" },
  { path: "/bonus", changefreq: "daily", priority: "0.9" },
  { path: "/harajatlar", changefreq: "weekly", priority: "0.85" },
  { path: "/finance", changefreq: "weekly", priority: "0.85" },
  { path: "/safar", changefreq: "daily", priority: "0.88" },
  { path: "/analytics", changefreq: "weekly", priority: "0.82" },
  { path: "/mood-pulse", changefreq: "weekly", priority: "0.78" },
  { path: "/xodim-kpi", changefreq: "weekly", priority: "0.8" },
  { path: "/recurring", changefreq: "weekly", priority: "0.72" },
  { path: "/kunlik-hisobotlar", changefreq: "daily", priority: "0.84" },
  { path: "/reklama", changefreq: "daily", priority: "0.88" },
  { path: "/media", changefreq: "weekly", priority: "0.8" },
  { path: "/hodimlar", changefreq: "weekly", priority: "0.78" },
  { path: "/vazifalar", changefreq: "daily", priority: "0.86" },
  { path: "/audit", changefreq: "weekly", priority: "0.68" },
  { path: "/profil", changefreq: "monthly", priority: "0.65" },
  { path: "/sozlamalar", changefreq: "monthly", priority: "0.7" },
  { path: "/ai-yordamchi", changefreq: "weekly", priority: "0.76" }
];

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
${SITEMAP_ROUTES.map(
  (route) => `  <url>
    <loc>${SITE_URL}${route.path}</loc>
    <lastmod>${BUILD_DATE}</lastmod>
    <changefreq>${route.changefreq}</changefreq>
    <priority>${route.priority}</priority>
  </url>`
).join("\n")}
</urlset>
`;

const llmsTxt = `# ${TITLE}
> ${DESCRIPTION}

URL: ${SITE_URL}/
Summary: ${DESCRIPTION}
Routes:
${SITEMAP_ROUTES.map((route) => `- ${SITE_URL}${route.path}`).join("\n")}
`;

fs.writeFileSync(path.join(publicDir, "robots.txt"), robotsTxt, "utf8");
fs.writeFileSync(path.join(publicDir, "sitemap.xml"), sitemapXml, "utf8");
fs.writeFileSync(path.join(publicDir, "llms.txt"), llmsTxt, "utf8");

console.log(`SEO files generated for ${SITE_URL}`);
