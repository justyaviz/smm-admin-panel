import { Router } from 'express';
import { z } from 'zod';
import { authRequired } from '../middleware/auth.js';
import {
  getEditors, getPresenceSnapshot, markOffline, markOnline, setEditing, subscribeRealtime,
} from '../services/realtime.js';

const router = Router();
router.use(authRequired);

router.get('/presence', (_request, response) => {
  response.json({ items: getPresenceSnapshot() });
});

router.post('/editing', (request, response) => {
  const parsed = z.object({
    entityType: z.enum(['content','task','campaign','expense']),
    entityId: z.coerce.number().int().positive(),
    active: z.boolean().default(true),
  }).safeParse(request.body);
  if (!parsed.success) return response.status(400).json({ message: 'Editing presence ma’lumotlari noto‘g‘ri.' });
  const data = parsed.data;
  const editors = setEditing(request.user, data.entityType, data.entityId, data.active);
  return response.json({ ok: true, editors });
});

router.get('/editing/:entityType/:entityId', (request, response) => {
  const entityId = Number(request.params.entityId);
  if (!Number.isInteger(entityId) || entityId <= 0) return response.status(400).json({ message: 'Entity ID noto‘g‘ri.' });
  response.json({ items: getEditors(String(request.params.entityType), entityId) });
});

router.get('/events', (request, response) => {
  response.status(200);
  response.setHeader('Content-Type', 'text/event-stream; charset=utf-8');
  response.setHeader('Cache-Control', 'no-cache, no-transform');
  response.setHeader('Connection', 'keep-alive');
  response.setHeader('X-Accel-Buffering', 'no');
  response.flushHeaders?.();

  markOnline(request.user);

  const send = (event) => {
    if (event.userIds && !event.userIds.includes(Number(request.user.id))) return;
    response.write(`id: ${event.id}\n`);
    response.write(`event: ${event.event}\n`);
    response.write(`data: ${JSON.stringify(event)}\n\n`);
  };

  response.write(`event: connected\ndata: ${JSON.stringify({
    ok: true,
    userId: Number(request.user.id),
    onlineUsers: getPresenceSnapshot(),
    at: new Date().toISOString(),
  })}\n\n`);

  const unsubscribe = subscribeRealtime(send);
  const heartbeat = setInterval(() => response.write(`event: ping\ndata: ${Date.now()}\n\n`), 20_000);
  let closed = false;
  const close = () => {
    if (closed) return;
    closed = true;
    clearInterval(heartbeat);
    unsubscribe();
    markOffline(request.user);
    response.end();
  };
  request.on('close', close);
  response.on('close', close);
});

export default router;
