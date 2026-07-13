import { Router } from 'express';
import { z } from 'zod';
import { pool } from '../db/pool.js';
import { env } from '../config/env.js';
import { authRequired, permissionRequired } from '../middleware/auth.js';

const router = Router();
router.use(authRequired);

const requestSchema = z.object({
  task: z.enum(['caption', 'hooks', 'reels_script', 'cta', 'shorten', 'translate_ru', 'translate_tr', 'hashtags', 'ideas', 'explain_report']),
  prompt: z.string().trim().min(2).max(8000),
  tone: z.string().trim().max(80).optional().default('do‘stona va savdoga yo‘naltirilgan'),
  platform: z.string().trim().max(60).optional().default('Instagram'),
});

const taskLabels = {
  caption: 'SMM caption', hooks: 'kuchli hooklar', reels_script: 'Reels ssenariysi', cta: 'CTA variantlari',
  shorten: 'qisqartirilgan matn', translate_ru: 'ruscha tarjima', translate_tr: 'turkcha tarjima',
  hashtags: 'hashtaglar', ideas: 'kontent g‘oyalari', explain_report: 'hisobot izohi',
};

function localGenerate({ task, prompt, tone, platform }) {
  const cleaned = prompt.replace(/\s+/g, ' ').trim();
  const hooks = [
    `Buni ko‘rmasdan xarid qilmang: ${cleaned}`,
    `${cleaned} — siz kutgan imkoniyat aynan hozir!`,
    `Narxini eshitsangiz, albatta qiziqasiz: ${cleaned}`,
    `Bugungi eng foydali tanlov: ${cleaned}`,
    `${cleaned} haqida 30 soniyada eng muhim ma’lumotlar`,
  ];
  if (task === 'hooks') return hooks.map((value, index) => `${index + 1}. ${value}`).join('\n');
  if (task === 'cta') return ['Hoziroq yozing va batafsil ma’lumot oling.', 'Yaqin aloo filialiga tashrif buyuring.', 'Izohda “+” qoldiring — siz bilan bog‘lanamiz.', 'Do‘stingizga yuboring va birga tanlang.', 'Joylar yoki mahsulotlar tugamasidan buyurtma bering.'].join('\n');
  if (task === 'hashtags') {
    const words = cleaned.toLowerCase().replace(/[^a-zA-Z0-9ʻ’'\u0400-\u04FF\s]/g, '').split(/\s+/).filter((w) => w.length > 3).slice(0, 8);
    return ['#aloo', '#aloouz', '#texnika', '#aksiya', ...words.map((w) => `#${w.replace(/[ʻ’']/g, '')}`)].join(' ');
  }
  if (task === 'shorten') return cleaned.length > 220 ? `${cleaned.slice(0, 210).trim()}…` : cleaned;
  if (task === 'translate_ru') return `RU tarjima uchun AI API kaliti ulanmagan. Mazmun: ${cleaned}`;
  if (task === 'translate_tr') return `TR tarjima uchun AI API kaliti ulanmagan. Mazmun: ${cleaned}`;
  if (task === 'reels_script') return `HOOK (0–3 soniya): ${hooks[0]}\n\nKADR 1 (3–8 soniya): Mahsulot yoki xizmatni yaqin planda ko‘rsating.\nOVOZ: “${cleaned}”\n\nKADR 2 (8–18 soniya): 3 ta asosiy foydani tez tempda ko‘rsating.\n\nKADR 3 (18–25 soniya): Narx, aksiya yoki ishonch dalilini ko‘rsating.\n\nCTA (25–30 soniya): “Hoziroq aloo bilan bog‘laning yoki yaqin filialga keling.”`;
  if (task === 'ideas') return [`1. “1 daqiqada tanlov” — ${cleaned}`, `2. Sotuvchi tavsiyasi — ${cleaned}`, `3. Mijoz reaksiyasi — ${cleaned}`, `4. Oldin / keyin formatida ${cleaned}`, `5. Savol-javob: ${cleaned} haqida eng ko‘p so‘raladigan 5 savol`, `6. Narx topish o‘yini — ${cleaned}`, `7. Filial bo‘ylab tezkor tur — ${cleaned}`].join('\n');
  if (task === 'explain_report') return `Asosiy xulosa: ${cleaned}\n\nTavsiya: eng yaxshi natija bergan platforma va filialga ko‘proq resurs ajrating, past natijali reklamalarda kreativ, auditoriya va CTA ni A/B test qiling. Keyingi 7 kun uchun aniq maqsad belgilang.`;
  return `${hooks[1]}\n\n${cleaned}\n\n✨ Qulay tanlov, ishonchli xizmat va foydali narxlar — aloo’da.\n\n📍 Yaqin filialimizga tashrif buyuring yoki hoziroq yozing.\n\n${tone} · ${platform}`;
}

async function openAiGenerate(data) {
  const instruction = `Sen aloo elektronika do‘konlar tarmog‘i uchun professional SMM yordamchisan. O‘zbek tilida, tabiiy, qisqa va sotuvga yo‘naltirilgan yoz. Vazifa: ${taskLabels[data.task]}. Ohang: ${data.tone}. Platforma: ${data.platform}. Keraksiz izoh bermay, faqat tayyor natijani qaytar.`;
  const response = await fetch('https://api.openai.com/v1/responses', {
    method: 'POST',
    headers: { 'Content-Type': 'application/json', Authorization: `Bearer ${env.openAiApiKey}` },
    body: JSON.stringify({ model: env.openAiModel, input: `${instruction}\n\nFoydalanuvchi matni:\n${data.prompt}`, max_output_tokens: 900 }),
  });
  const payload = await response.json().catch(() => ({}));
  if (!response.ok) throw new Error(payload?.error?.message || 'AI provayder javob bermadi.');
  if (payload.output_text) return payload.output_text;
  const parts = (payload.output || []).flatMap((item) => item.content || []).map((part) => part.text).filter(Boolean);
  return parts.join('\n').trim();
}

router.post('/generate', permissionRequired('ai.use'), async (request, response, next) => {
  try {
    const parsed = requestSchema.safeParse(request.body);
    if (!parsed.success) return response.status(400).json({ message: 'AI so‘rovini tekshiring.', errors: parsed.error.flatten() });
    const data = parsed.data;
    let result;
    let provider = 'local';
    if (env.openAiApiKey) {
      try {
        result = await openAiGenerate(data);
        provider = 'openai';
      } catch (error) {
        console.warn('OpenAI fallback:', error.message);
        result = localGenerate(data);
      }
    } else result = localGenerate(data);
    await pool.query(
      `INSERT INTO ai_activity_logs(user_id,task,prompt,result,provider) VALUES($1,$2,$3,$4,$5)`,
      [request.user.id, data.task, data.prompt, result, provider],
    ).catch(() => {});
    return response.json({ result, provider });
  } catch (error) { return next(error); }
});

export default router;
