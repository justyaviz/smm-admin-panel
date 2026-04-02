function getConfig() {
  const rawEnabled = String(process.env.MYSEONE_SYNC_ENABLED || "").trim().toLowerCase();
  const baseUrl = String(process.env.MYSEONE_BASE_URL || "https://my.se-one.uz").trim().replace(/\/+$/, "");
  const login = String(process.env.MYSEONE_LOGIN || "").trim();
  const password = String(process.env.MYSEONE_PASSWORD || "");
  const timeoutMs = Math.max(3000, Number(process.env.MYSEONE_TIMEOUT_MS || 15000));
  const enabled = rawEnabled ? rawEnabled !== "false" : Boolean(baseUrl && login && password);
  return { enabled, baseUrl, login, password, timeoutMs };
}

export function isMySeOneSyncEnabled() {
  const config = getConfig();
  return Boolean(config.enabled && config.baseUrl && config.login && config.password);
}

function normalizeText(value) {
  return String(value || "")
    .normalize("NFKD")
    .replace(/[\u0300-\u036f]/g, "")
    .replace(/[’'`´]/g, "")
    .replace(/[“”"]/g, "")
    .replace(/[\u2013\u2014]/g, "-")
    .replace(/\?/g, "")
    .replace(/[^\p{L}\p{N}]+/gu, " ")
    .replace(/\s+/g, " ")
    .trim()
    .toLowerCase();
}

export function sanitizeMySeOneTitle(value) {
  return String(value || "")
    .replace(/[–—]/g, "-")
    .replace(/[’‘`´]/g, "'")
    .replace(/[“”]/g, "\"")
    .replace(/[\u{1F300}-\u{1FAFF}]/gu, "")
    .replace(/[\u2600-\u27BF]/gu, "")
    .replace(/\u200D/gu, "")
    .replace(/\uFE0F/gu, "")
    .replace(/\?+/g, "")
    .replace(/\s+/g, " ")
    .trim();
}

function toDateOnly(value) {
  if (!value) return null;
  if (typeof value === "string" && /^\d{4}-\d{2}-\d{2}$/.test(value)) return value;
  if (typeof value === "string") {
    const trimmed = value.trim();
    const match = trimmed.match(/^(\d{2})\/(\d{2})\/(\d{4})$/);
    if (match) {
      const [, day, month, year] = match;
      return `${year}-${month}-${day}`;
    }
  }
  const date = new Date(value);
  if (Number.isNaN(date.getTime())) return null;
  return date.toISOString().slice(0, 10);
}

function toMonthLabel(value) {
  const dateOnly = toDateOnly(value);
  return dateOnly ? dateOnly.slice(0, 7) : "";
}

function toDisplayDate(value) {
  const dateOnly = toDateOnly(value);
  if (!dateOnly) return "";
  const [year, month, day] = dateOnly.split("-");
  return `${day}/${month}/${year}`;
}

function normalizeOptionalUrl(value) {
  const raw = String(value || "").trim();
  if (!raw || raw === "-" || raw === "—") return "";
  if (/^https?:\/\//i.test(raw)) return raw;
  if (/^www\./i.test(raw)) return `https://${raw}`;
  return raw;
}

function mergeCookies(current, setCookies) {
  const jar = new Map();

  for (const part of String(current || "").split(";")) {
    const [name, ...rest] = part.trim().split("=");
    if (name && rest.length) {
      jar.set(name.trim(), rest.join("="));
    }
  }

  for (const raw of setCookies || []) {
    const first = String(raw || "").split(";")[0];
    const [name, ...rest] = first.split("=");
    if (name && rest.length) {
      jar.set(name.trim(), rest.join("="));
    }
  }

  return Array.from(jar.entries())
    .map(([key, value]) => `${key}=${value}`)
    .join("; ");
}

function decodeHtml(value) {
  return String(value || "")
    .replace(/&nbsp;/g, " ")
    .replace(/&amp;/g, "&")
    .replace(/&quot;/g, "\"")
    .replace(/&#0*39;/g, "'")
    .replace(/&lt;/g, "<")
    .replace(/&gt;/g, ">");
}

function stripTags(value) {
  return decodeHtml(String(value || "").replace(/<[^>]+>/g, " "))
    .replace(/\s+/g, " ")
    .trim();
}

function categoryValueForContentType(contentType) {
  const type = String(contentType || "").trim().toLowerCase();
  if (type === "video") return "5";
  if (type === "reels" || type === "mobi-video") return "1";
  if (type === "banner" || type === "flayer" || type === "do'kon dizayni") return "4";
  if (type === "motion") return "3";
  if (type === "boshqa-ishlar" || type === "boshqalar" || type === "aloo.uz sayti") return "6";
  return "2";
}

function categoryNameFromValue(value) {
  const normalized = String(value || "").trim().toLowerCase();
  if (normalized === "1" || normalized === "reels") return "reels";
  if (normalized === "2" || normalized === "post") return "post";
  if (normalized === "3" || normalized === "motion") return "motion";
  if (normalized === "4" || normalized === "dizayn") return "dizayn";
  if (normalized === "5" || normalized === "video") return "video";
  if (normalized === "6" || normalized === "boshqa") return "boshqa";
  return normalized;
}

function mapMySeOneCategoryToContentType(categoryValue, currentType = "") {
  const category = categoryNameFromValue(categoryValue);
  const normalizedCurrent = String(currentType || "").trim().toLowerCase();

  if (category === "reels" || category === "video") {
    if (["reels", "video", "mobi-video"].includes(normalizedCurrent)) {
      return normalizedCurrent;
    }
    return "reels";
  }

  if (category === "dizayn") {
    if (["banner", "flayer", "do'kon dizayni"].includes(normalizedCurrent)) {
      return normalizedCurrent;
    }
    return "banner";
  }

  if (category === "boshqa") {
    if (["boshqa-ishlar", "boshqalar", "aloo.uz sayti"].includes(normalizedCurrent)) {
      return normalizedCurrent;
    }
    return "boshqa-ishlar";
  }

  if (category === "motion") return "motion";
  if (category === "post") {
    return normalizedCurrent === "story" ? "story" : "post";
  }

  return normalizedCurrent || "post";
}

function mapEmployee(name) {
  const normalized = String(name || "").trim().toUpperCase();
  if (normalized === "ADMIN AI" || normalized === "YAHYOBEK") {
    return { id: "482", label: "TOHIRJONOV YAHYOBEK" };
  }
  if (normalized === "MUHAMMADAMIN") {
    return { id: "508", label: "OTAXONOV JASURBEK" };
  }
  return null;
}

function buildParticipantList(row) {
  const names = row.content_type === "video"
    ? [row.video_editor_name, row.video_face_name]
    : [row.full_name];

  return names
    .map((value) => String(value || "").trim())
    .filter(Boolean)
    .map(mapEmployee)
    .filter(Boolean)
    .filter((entry, index, arr) => arr.findIndex((item) => item.id === entry.id) === index);
}

function buildPayload(row) {
  const workDate = toDateOnly(row.work_date);
  const monthLabel = String(row.month_label || "").trim() || toMonthLabel(workDate);
  const participants = buildParticipantList(row);
  const insertTitle = sanitizeMySeOneTitle(row.content_title || "");
  const lookupTitle = sanitizeMySeOneTitle(row.myseone_synced_title || row.content_title || "");

  if (!workDate || !monthLabel) {
    throw new Error("my.se-one sync uchun sana topilmadi");
  }

  if (!insertTitle) {
    throw new Error("my.se-one sync uchun sarlavha topilmadi");
  }

  if (!participants.length) {
    throw new Error(`my.se-one sync uchun hodim mapping topilmadi: ${row.content_title || row.id}`);
  }

  const complexity = Number(row.proposal_count || 0) >= 2 ? "3" : "1";

  return {
    monthLabel,
    dateValue: workDate,
    dateDisplay: toDisplayDate(workDate),
    title: insertTitle,
    lookupTitle,
    workUrl: normalizeOptionalUrl(row.work_url || row.final_url || ""),
    categoryValue: categoryValueForContentType(row.content_type),
    employee1Id: participants[0]?.id || "",
    employee1Label: participants[0]?.label || "",
    complexity1Value: participants[0] ? complexity : "",
    employee2Id: participants[1]?.id || "",
    employee2Label: participants[1]?.label || "",
    complexity2Value: participants[1] ? complexity : ""
  };
}

async function fetchText(url, options = {}, timeoutMs = 15000) {
  const response = await fetch(url, {
    ...options,
    signal: AbortSignal.timeout(timeoutMs)
  });
  const text = await response.text();
  return { response, text };
}

async function createSession() {
  const config = getConfig();
  if (!config.enabled) {
    throw new Error("my.se-one sync o'chirilgan");
  }
  if (!config.baseUrl || !config.login || !config.password) {
    throw new Error("my.se-one sync konfiguratsiyasi to'liq emas");
  }

  let cookie = "";
  const loginUrl = `${config.baseUrl}/login.php?key_one_loogin=succcess`;

  const loginPage = await fetch(loginUrl, {
    signal: AbortSignal.timeout(config.timeoutMs)
  });
  cookie = mergeCookies(cookie, loginPage.headers.getSetCookie?.() || []);

  const loginBody = new URLSearchParams({
    login_r: config.login,
    parol_r: config.password
  });

  const loginResult = await fetch(loginUrl, {
    method: "POST",
    headers: {
      cookie,
      "content-type": "application/x-www-form-urlencoded"
    },
    body: loginBody,
    redirect: "manual",
    signal: AbortSignal.timeout(config.timeoutMs)
  });

  cookie = mergeCookies(cookie, loginResult.headers.getSetCookie?.() || []);

  if (!cookie) {
    throw new Error("my.se-one cookie olinmadi");
  }

  return {
    ...config,
    cookie,
    loadUrl: `${config.baseUrl}/marketing/load_smm_bonus.php`
  };
}

function parseRowsFromTable(html) {
  const rows = [];
  for (const tr of String(html || "").match(/<tr>[\s\S]*?<\/tr>/g) || []) {
    const idMatch = tr.match(/editItem\(`(\d+)`\)/) || tr.match(/deleteItem\(`(\d+)`\)/);
    if (!idMatch) continue;

    const cells = [];
    const cellPattern = /<(td|th)[^>]*>([\s\S]*?)<\/\1>/g;
    let match = null;
    while ((match = cellPattern.exec(tr))) {
      cells.push(stripTags(match[2]));
    }

    rows.push({
      id: Number(idMatch[1]),
      category: categoryNameFromValue(cells[1] || ""),
      title: sanitizeMySeOneTitle(cells[2] || ""),
      link: normalizeOptionalUrl(cells[3] || ""),
      employee1: cells[4] || "",
      complexity1: cells[5] || "",
      employee2: cells[7] || "",
      complexity2: cells[8] || "",
      date: cells[10] || "",
      dateValue: toDateOnly(cells[10] || "")
    });
  }
  return rows;
}

async function loadMonthRows(session, monthLabel) {
  const body = new URLSearchParams({
    sana_oy: String(monthLabel || ""),
    key: "load"
  });

  const { response, text } = await fetchText(session.loadUrl, {
    method: "POST",
    headers: {
      cookie: session.cookie,
      "content-type": "application/x-www-form-urlencoded"
    },
    body
  }, session.timeoutMs);

  if (!response.ok) {
    throw new Error(`my.se-one jadvalini olib bo'lmadi (${response.status})`);
  }

  return parseRowsFromTable(text);
}

async function loadRemoteRowById(session, remoteId) {
  const body = new URLSearchParams({
    id: String(remoteId || ""),
    key: "edit"
  });

  const { response, text } = await fetchText(session.loadUrl, {
    method: "POST",
    headers: {
      cookie: session.cookie,
      "content-type": "application/x-www-form-urlencoded"
    },
    body
  }, session.timeoutMs);

  if (!response.ok) {
    throw new Error(`my.se-one yozuvini olib bo'lmadi (${response.status})`);
  }

  let parsed = null;
  try {
    parsed = JSON.parse(text);
  } catch {
    throw new Error("my.se-one edit javobi JSON emas");
  }

  if (!parsed?.success || !parsed?.data) {
    throw new Error(parsed?.message || "my.se-one edit ma'lumoti topilmadi");
  }

  return {
    id: Number(parsed.data.id || remoteId || 0),
    category: categoryNameFromValue(parsed.data.tur_id || ""),
    title: sanitizeMySeOneTitle(parsed.data.nomi || ""),
    link: normalizeOptionalUrl(parsed.data.link || ""),
    dateValue: toDateOnly(parsed.data.bajarilgan_sana || ""),
    date: toDisplayDate(parsed.data.bajarilgan_sana || "")
  };
}

function findExactRow(rows, payload, useLookupTitle = false) {
  const titleNeedle = normalizeText(useLookupTitle ? payload.lookupTitle : payload.title);
  const matches = rows.filter((row) => (
    row.date === payload.dateDisplay
    && normalizeText(row.title) === titleNeedle
    && normalizeText(row.employee1) === normalizeText(payload.employee1Label)
    && normalizeText(row.employee2) === normalizeText(payload.employee2Label)
  ));

  if (!matches.length) return null;
  matches.sort((a, b) => b.id - a.id);
  return matches[0];
}

function findLooseRow(rows, payload) {
  const titleNeedles = [payload.lookupTitle, payload.title]
    .map((value) => normalizeText(value))
    .filter(Boolean);

  const matches = rows.filter((row) => (
    row.date === payload.dateDisplay
    && titleNeedles.includes(normalizeText(row.title))
  ));

  if (!matches.length) return null;
  matches.sort((a, b) => b.id - a.id);
  return matches[0];
}

async function deleteRemoteRow(session, remoteId) {
  const body = new URLSearchParams({
    id: String(remoteId || ""),
    izoh: "AlooSMM avtomatik sync",
    key: "delete"
  });

  const { response, text } = await fetchText(session.loadUrl, {
    method: "POST",
    headers: {
      cookie: session.cookie,
      "content-type": "application/x-www-form-urlencoded"
    },
    body
  }, session.timeoutMs);

  if (!response.ok) {
    throw new Error(`my.se-one yozuvini o'chirib bo'lmadi (${response.status})`);
  }

  const normalized = String(text || "").trim().toLowerCase();
  if (normalized && normalized !== "ok") {
    throw new Error(`my.se-one o'chirish javobi kutilmagan: ${text.slice(0, 200)}`);
  }
}

async function insertRemoteRow(session, payload) {
  const body = new URLSearchParams({
    key: "insert",
    tur_id: payload.categoryValue,
    nomi: payload.title,
    link: payload.workUrl || "",
    xodim_id1: payload.employee1Id,
    bonus_1: payload.complexity1Value,
    xodim_id2: payload.employee2Id,
    bonus_2: payload.complexity2Value,
    sana: payload.dateValue
  });

  const { response, text } = await fetchText(session.loadUrl, {
    method: "POST",
    headers: {
      cookie: session.cookie,
      "content-type": "application/x-www-form-urlencoded"
    },
    body
  }, session.timeoutMs);

  if (!response.ok) {
    throw new Error(`my.se-one yozuvini qo'shib bo'lmadi (${response.status})`);
  }

  if (text.trim().startsWith("{")) {
    try {
      const parsed = JSON.parse(text);
      if (parsed.status && parsed.status !== "success") {
        throw new Error(parsed.message || "my.se-one insert xatoligi");
      }
    } catch (err) {
      throw new Error(err.message || "my.se-one JSON javobi o'qilmadi");
    }
  }
}

export async function syncBonusUpsertToMySeOne(row) {
  const session = await createSession();
  const payload = buildPayload(row);
  let remoteId = Number(row.myseone_item_id || 0);

  if (!remoteId) {
    const rows = await loadMonthRows(session, payload.monthLabel);
    remoteId = findExactRow(rows, payload, true)?.id || findLooseRow(rows, payload)?.id || 0;
  }

  if (remoteId) {
    await deleteRemoteRow(session, remoteId);
  }

  await insertRemoteRow(session, payload);

  const refreshedRows = await loadMonthRows(session, payload.monthLabel);
  const inserted = findExactRow(refreshedRows, payload, false) || findLooseRow(refreshedRows, payload);

  if (!inserted?.id) {
    throw new Error("my.se-one insert qilingan yozuv topilmadi");
  }

  return {
    remoteId: inserted.id,
    syncedTitle: payload.title
  };
}

export async function syncBonusDeleteToMySeOne(row) {
  const session = await createSession();
  let remoteId = Number(row?.myseone_item_id || 0);

  if (!remoteId) {
    let payload = null;
    try {
      payload = buildPayload(row);
    } catch {
      payload = null;
    }

    if (payload?.monthLabel) {
      const rows = await loadMonthRows(session, payload.monthLabel);
      remoteId = findExactRow(rows, payload, true)?.id || findLooseRow(rows, payload)?.id || 0;
    }
  }

  if (!remoteId) {
    return { deleted: false };
  }

  await deleteRemoteRow(session, remoteId);
  return { deleted: true, remoteId };
}

export async function pullBonusMirrorFromMySeOne(rows = []) {
  const session = await createSession();
  const monthCache = new Map();
  const remoteRows = Array.isArray(rows)
    ? rows.filter((row) => Number(row?.myseone_item_id || 0) > 0)
    : [];

  for (const row of remoteRows) {
    const monthLabel = String(row?.month_label || "").trim() || toMonthLabel(row?.work_date);
    if (!monthLabel || monthCache.has(monthLabel)) continue;
    monthCache.set(monthLabel, await loadMonthRows(session, monthLabel));
  }

  const updates = [];
  for (const row of remoteRows) {
    const remoteId = Number(row?.myseone_item_id || 0);
    if (!remoteId) continue;

    const monthLabel = String(row?.month_label || "").trim() || toMonthLabel(row?.work_date);
    const monthRows = monthCache.get(monthLabel) || [];
    let remote = monthRows.find((item) => Number(item.id) === remoteId) || null;

    if (!remote) {
      try {
        remote = await loadRemoteRowById(session, remoteId);
      } catch {
        remote = null;
      }
    }

    if (!remote?.id) {
      updates.push({
        id: Number(row.id || 0),
        remoteId,
        found: false
      });
      continue;
    }

    const workDate = remote.dateValue || toDateOnly(row.work_date);
    updates.push({
      id: Number(row.id || 0),
      remoteId,
      found: true,
      title: remote.title || sanitizeMySeOneTitle(row.content_title || ""),
      workUrl: normalizeOptionalUrl(remote.link || ""),
      workDate,
      monthLabel: toMonthLabel(workDate) || String(row?.month_label || "").trim(),
      contentType: mapMySeOneCategoryToContentType(remote.category, row.content_type || ""),
      category: remote.category || "",
      syncedTitle: remote.title || sanitizeMySeOneTitle(row.myseone_synced_title || row.content_title || "")
    });
  }

  return updates;
}
