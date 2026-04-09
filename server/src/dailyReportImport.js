import { Jimp } from "jimp";
import Tesseract from "tesseract.js";

let workerPromise = null;

const CUSTOM_BRANCH_ALIASES = {
  boshofis: ["aloouz", "aloouzu", "aloo.uz", "aloo.uz_", "@aloo.uz_", "@aloouz", "aloouzplatform", "aloosmm"],
  ohangaron: ["ohangaron"],
  angren: ["angren"],
  chirchiq: ["chirchiq", "chirchiq"],
  guliston: ["guliston"],
  jarqorgon: ["jarqorgon", "jarqorgon", "jarqorgon", "jarqorgon"],
  sherobod: ["sherobod"],
  qibray: ["qibray", "qibraiy"],
  gazalkent: ["gazalkent", "qazalkent"],
  olmaliq: ["olmaliq", "almaliq"],
  piskent: ["piskent"],
  oqqorgon: ["oqqorgon", "oqoqrgon", "oqkorgon", "oqqorqon"],
  chinoz: ["chinoz"],
  shorchi: ["shurchi", "shorchi", "shoorchi"],
  parkent: ["parkent"]
};

function normalizeToken(value = "") {
  return String(value || "")
    .toLowerCase()
    .normalize("NFD")
    .replace(/[\u0300-\u036f]/g, "")
    .replace(/[‘’`´'"]/g, "")
    .replace(/[^a-z0-9]+/g, "");
}

function uniq(values = []) {
  return [...new Set(values.filter(Boolean))];
}

function formatDateParts(day, month, year) {
  const d = String(day).padStart(2, "0");
  const m = String(month).padStart(2, "0");
  return `${year}-${m}-${d}`;
}

function normalizeDateValue(value = "") {
  if (!value) return "";
  const raw = String(value).trim();
  if (/^\d{4}-\d{2}-\d{2}$/.test(raw)) return raw;

  const dateWithSeparators = raw.match(/(\d{1,2})[\.\-\/ ]+(\d{1,2})[\.\-\/ ]+(20\d{2})/);
  if (dateWithSeparators) {
    return formatDateParts(dateWithSeparators[1], dateWithSeparators[2], dateWithSeparators[3]);
  }

  const compactDate = raw.match(/\b(\d{2})(\d{2})(20\d{2})\b/);
  if (compactDate) {
    return formatDateParts(compactDate[1], compactDate[2], compactDate[3]);
  }

  return "";
}

function extractDateCandidates(text = "") {
  const dates = [];
  const regex = /(\d{1,2})[\.\-\/ ]+(\d{1,2})[\.\-\/ ]+(20\d{2})/g;
  let match = regex.exec(text);
  while (match) {
    dates.push(formatDateParts(match[1], match[2], match[3]));
    match = regex.exec(text);
  }
  return uniq(dates);
}

function buildBranchMatchers(branches = []) {
  return branches.map((branch) => {
    const normalizedName = normalizeToken(branch.name);
    const aliases = uniq([
      normalizedName,
      ...(CUSTOM_BRANCH_ALIASES[normalizedName] || [])
    ]).sort((a, b) => b.length - a.length);

    return {
      branch,
      aliases
    };
  });
}

function findBranchMatcher(text = "", matchers = []) {
  const normalized = normalizeToken(text);
  if (!normalized) return null;

  for (const matcher of matchers) {
    if (matcher.aliases.some((alias) => normalized.includes(alias))) {
      return matcher;
    }
  }

  return null;
}

function extractNumericGroups(line = "") {
  const firstLetterIndex = line.search(/[A-Za-z]/);
  const matches = [...String(line || "").matchAll(/\d+/g)];
  const filtered = matches.filter((match, index) => {
    return !(index === 0 && firstLetterIndex !== -1 && match.index < firstLetterIndex);
  });
  return filtered.map((match) => match[0]);
}

function getLineText(line) {
  if (!line) return "";
  if (typeof line === "string") return line.trim();
  return String(line.text || "").trim();
}

function getSortedLines(lines = []) {
  return [...(lines || [])]
    .map((line) => ({
      text: getLineText(line),
      y: Number(line?.bbox?.y0 || line?.y || 0),
      x: Number(line?.bbox?.x0 || line?.x || 0)
    }))
    .filter((line) => line.text)
    .sort((a, b) => (a.y === b.y ? a.x - b.x : a.y - b.y));
}

function buildCandidateLines(result = {}) {
  const seen = new Set();
  const merged = [];

  const push = (text = "") => {
    const cleaned = getLineText(text);
    if (!cleaned) return;
    const key = `${normalizeToken(cleaned)}::${cleaned.length}`;
    if (seen.has(key)) return;
    seen.add(key);
    merged.push({ text: cleaned });
  };

  (result.lines || []).forEach((line) => push(line.text));
  String(result.text || "")
    .split(/\r?\n/)
    .forEach((line) => push(line));

  return merged;
}

async function getOcrWorker() {
  if (!workerPromise) {
    workerPromise = (async () => {
      const worker = await Tesseract.createWorker("eng");
      await worker.setParameters({
        preserve_interword_spaces: "1"
      });
      return worker;
    })();
  }
  return workerPromise;
}

async function recognizeImage(filePath, rotate = 0) {
  const image = await Jimp.read(filePath);

  if (rotate) {
    image.rotate(rotate);
  }

  if (image.bitmap.width < 1800) {
    image.scale(2);
  }

  image.greyscale().normalize().contrast(0.35).threshold({ max: 185 });

  const buffer = await image.getBuffer("image/png");
  const worker = await getOcrWorker();
  const { data } = await worker.recognize(buffer);

  return {
    text: String(data?.text || ""),
    lines: getSortedLines(data?.lines || [])
  };
}

function pickOrderedDates(results = []) {
  let best = [];

  results.forEach((result) => {
    const dates = extractDateCandidates(result?.text || "");
    if (dates.length > best.length) {
      best = dates;
    }
  });

  return best;
}

function parseAudienceMetrics(lines = [], matchers = []) {
  const map = new Map();

  for (let index = 0; index < lines.length; index += 1) {
    const current = lines[index]?.text || "";
    const matcher = findBranchMatcher(current, matchers);
    if (!matcher) continue;

    const candidate = [
      lines[index - 1]?.text || "",
      current,
      lines[index + 1]?.text || "",
      lines[index + 2]?.text || ""
    ].join(" ");
    const numbers = extractNumericGroups(candidate);

    if (!numbers.length) continue;

    map.set(matcher.branch.id, {
      subscriber_count: Number(numbers[0] || 0),
      condition_text: numbers.slice(1).join(" ").trim()
    });
  }

  return map;
}

function parseContentMetrics(lines = [], matchers = [], orderedDates = [], targetDate = "") {
  const warnings = [];
  const map = new Map();
  const pairCount = orderedDates.length * 2;

  if (!orderedDates.length) {
    warnings.push("Post va story jadvalidan sana ustunlari topilmadi.");
    return { map, warnings };
  }

  let dateIndex = orderedDates.indexOf(targetDate);
  if (dateIndex === -1) {
    dateIndex = orderedDates.length - 1;
    warnings.push("Tanlangan sana jadvaldan topilmadi, eng oxirgi ustun ishlatildi.");
  }

  for (let index = 0; index < lines.length; index += 1) {
    const current = lines[index]?.text || "";
    const matcher = findBranchMatcher(current, matchers);
    if (!matcher) continue;

    let candidate = current;
    let numbers = extractNumericGroups(candidate);

    if (numbers.length < pairCount && lines[index + 1]?.text) {
      candidate = `${candidate} ${lines[index + 1].text}`;
      numbers = extractNumericGroups(candidate);
    }

    if (numbers.length < pairCount) continue;

    const dailyNumbers = numbers.slice(0, pairCount);
    const story = Number(dailyNumbers[dateIndex * 2] || 0);
    const post = Number(dailyNumbers[dateIndex * 2 + 1] || 0);

    map.set(matcher.branch.id, {
      stories_count: story,
      posts_count: post
    });
  }

  return { map, warnings };
}

function parseSingleDayContentMetrics(lines = [], matchers = []) {
  const map = new Map();
  const warnings = [];

  for (let index = 0; index < lines.length; index += 1) {
    const current = lines[index]?.text || "";
    const matcher = findBranchMatcher(current, matchers);
    if (!matcher) continue;

    const candidate = [
      lines[index - 1]?.text || "",
      current,
      lines[index + 1]?.text || "",
      lines[index + 2]?.text || ""
    ].join(" ");
    const numbers = extractNumericGroups(candidate);

    if (numbers.length < 2) continue;

    const pair = numbers.slice(-2);
    map.set(matcher.branch.id, {
      stories_count: Number(pair[0] || 0),
      posts_count: Number(pair[1] || 0)
    });
  }

  if (!map.size) {
    warnings.push("Post/story rasmidan bir kunlik jadval ham o'qilmadi.");
  }

  return { map, warnings };
}

export async function importDailyReportsFromImages({
  contentImagePath,
  metricsImagePath,
  branches = [],
  reportDate = ""
}) {
  const warnings = [];
  const branchMatchers = buildBranchMatchers(branches);

  const [contentNormal, contentRotatedLeft, contentRotatedRight, metricsNormal] = await Promise.all([
    recognizeImage(contentImagePath, 0),
    recognizeImage(contentImagePath, -90),
    recognizeImage(contentImagePath, 90),
    recognizeImage(metricsImagePath, 0)
  ]);

  const orderedDates = pickOrderedDates([contentRotatedLeft, contentRotatedRight, contentNormal]);
  const resolvedReportDate =
    normalizeDateValue(reportDate) ||
    extractDateCandidates(metricsNormal.text)[0] ||
    orderedDates.at(-1) ||
    "";

  if (!resolvedReportDate) {
    throw new Error("Rasmlardan hisobot sanasini aniqlab bo'lmadi.");
  }

  const contentLines = buildCandidateLines(contentNormal);
  const metricsLines = buildCandidateLines(metricsNormal);

  const audienceMetrics = parseAudienceMetrics(metricsLines, branchMatchers);

  let contentMetrics = parseContentMetrics(contentLines, branchMatchers, orderedDates, resolvedReportDate);
  if (!contentMetrics.map.size) {
    const singleDayMetrics = parseSingleDayContentMetrics(contentLines, branchMatchers);
    contentMetrics = singleDayMetrics.map.size ? singleDayMetrics : contentMetrics;
    warnings.push(...singleDayMetrics.warnings);
  }

  warnings.push(...contentMetrics.warnings);

  const branchIds = uniq([
    ...contentMetrics.map.keys(),
    ...audienceMetrics.keys()
  ]);

  if (!branchIds.length) {
    throw new Error("Filial ma'lumotlarini rasmlardan ajratib bo'lmadi.");
  }

  const rows = branchIds.map((branchId) => ({
    report_date: resolvedReportDate,
    branch_id: branchId,
    stories_count: Number(contentMetrics.map.get(branchId)?.stories_count || 0),
    posts_count: Number(contentMetrics.map.get(branchId)?.posts_count || 0),
    subscriber_count: Number(audienceMetrics.get(branchId)?.subscriber_count || 0),
    condition_text: audienceMetrics.get(branchId)?.condition_text || "",
    notes: "Rasm orqali to'ldirildi"
  }));

  return {
    reportDate: resolvedReportDate,
    rows,
    warnings,
    parsedContentBranches: contentMetrics.map.size,
    parsedAudienceBranches: audienceMetrics.size,
    orderedDates
  };
}
