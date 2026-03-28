export const DEFAULT_SITE_URL = "https://smm-admin-panel-fron-production.up.railway.app";
export const DEFAULT_SEO_TITLE = "aloo SMM Panel";
export const DEFAULT_SEO_DESCRIPTION = "SMM va marketing boshqaruv tizimi";

function normalizeSiteUrl(value) {
  const trimmed = String(value || "").trim();

  if (!trimmed) return DEFAULT_SITE_URL;

  try {
    const url = new URL(trimmed);
    return url.toString().replace(/\/$/, "");
  } catch {
    return DEFAULT_SITE_URL;
  }
}

function upsertMeta(attr, value, content) {
  if (!value) return;

  let meta = document.head.querySelector(`meta[${attr}="${value}"]`);

  if (!meta) {
    meta = document.createElement("meta");
    meta.setAttribute(attr, value);
    document.head.appendChild(meta);
  }

  meta.setAttribute("content", content);
}

function upsertLink(rel, href) {
  let link = document.head.querySelector(`link[rel="${rel}"]`);

  if (!link) {
    link = document.createElement("link");
    link.setAttribute("rel", rel);
    document.head.appendChild(link);
  }

  link.setAttribute("href", href);
}

function upsertJsonLd(id, payload) {
  let script = document.head.querySelector(`script[data-seo-id="${id}"]`);

  if (!script) {
    script = document.createElement("script");
    script.type = "application/ld+json";
    script.dataset.seoId = id;
    document.head.appendChild(script);
  }

  script.textContent = JSON.stringify(payload);
}

export function resolveSiteUrl(settings = null) {
  return normalizeSiteUrl(settings?.website_url || import.meta.env.VITE_SITE_URL || DEFAULT_SITE_URL);
}

export function applySeo(settings = null) {
  const siteUrl = resolveSiteUrl(settings);
  const pageUrl = `${siteUrl}/`;
  const imageUrl = `${siteUrl}/icon-512.svg`;

  document.title = DEFAULT_SEO_TITLE;

  upsertMeta("name", "description", DEFAULT_SEO_DESCRIPTION);
  upsertMeta("name", "robots", "index, follow, max-image-preview:large, max-snippet:-1, max-video-preview:-1");
  upsertMeta("name", "googlebot", "index, follow, max-image-preview:large, max-snippet:-1, max-video-preview:-1");
  upsertMeta("property", "og:locale", "uz_UZ");
  upsertMeta("property", "og:type", "website");
  upsertMeta("property", "og:title", DEFAULT_SEO_TITLE);
  upsertMeta("property", "og:description", DEFAULT_SEO_DESCRIPTION);
  upsertMeta("property", "og:site_name", DEFAULT_SEO_TITLE);
  upsertMeta("property", "og:url", pageUrl);
  upsertMeta("property", "og:image", imageUrl);
  upsertMeta("name", "twitter:card", "summary_large_image");
  upsertMeta("name", "twitter:title", DEFAULT_SEO_TITLE);
  upsertMeta("name", "twitter:description", DEFAULT_SEO_DESCRIPTION);
  upsertMeta("name", "twitter:image", imageUrl);
  upsertLink("canonical", pageUrl);

  upsertJsonLd("website", {
    "@context": "https://schema.org",
    "@type": "WebSite",
    name: DEFAULT_SEO_TITLE,
    url: pageUrl,
    description: DEFAULT_SEO_DESCRIPTION,
    inLanguage: "uz-UZ"
  });
}
