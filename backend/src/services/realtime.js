import { EventEmitter } from 'node:events';

const bus = new EventEmitter();
bus.setMaxListeners(500);

const presence = new Map();
const editing = new Map();

export function publishRealtime(event, payload = {}, userIds = null) {
  bus.emit('event', {
    id: `${Date.now()}-${Math.random().toString(36).slice(2, 9)}`,
    event,
    payload,
    userIds: Array.isArray(userIds) ? userIds.map(Number) : null,
    createdAt: new Date().toISOString(),
  });
}

export function subscribeRealtime(listener) {
  bus.on('event', listener);
  return () => bus.off('event', listener);
}

export function markOnline(user) {
  const id = Number(user.id);
  const current = presence.get(id) || { count: 0, user: { id, fullName: user.full_name, role: user.role } };
  current.count += 1;
  current.lastSeenAt = new Date().toISOString();
  presence.set(id, current);
  if (current.count === 1) publishRealtime('presence.online', { ...current.user, online: true, lastSeenAt: current.lastSeenAt });
}

export function markOffline(user) {
  const id = Number(user.id);
  const current = presence.get(id);
  if (!current) return;
  current.count -= 1;
  current.lastSeenAt = new Date().toISOString();
  if (current.count <= 0) {
    presence.delete(id);
    publishRealtime('presence.online', { ...current.user, online: false, lastSeenAt: current.lastSeenAt });
    for (const [key, users] of editing.entries()) {
      if (users.delete(id)) publishRealtime('presence.editing', { key, entityType: key.split(':')[0], entityId: Number(key.split(':')[1]), user: current.user, active: false });
      if (!users.size) editing.delete(key);
    }
  } else {
    presence.set(id, current);
  }
}

export function getPresenceSnapshot() {
  return [...presence.values()].map((entry) => ({ ...entry.user, online: true, lastSeenAt: entry.lastSeenAt }));
}

export function setEditing(user, entityType, entityId, active = true) {
  const id = Number(user.id);
  const key = `${entityType}:${Number(entityId)}`;
  const users = editing.get(key) || new Map();
  const userInfo = { id, fullName: user.full_name, role: user.role };
  if (active) {
    users.set(id, { user: userInfo, expiresAt: Date.now() + 45_000 });
    editing.set(key, users);
  } else {
    users.delete(id);
    if (!users.size) editing.delete(key);
  }
  publishRealtime('presence.editing', { key, entityType, entityId: Number(entityId), user: userInfo, active });
  return [...(editing.get(key)?.values() || [])].map((entry) => entry.user);
}

export function getEditors(entityType, entityId) {
  const key = `${entityType}:${Number(entityId)}`;
  return [...(editing.get(key)?.values() || [])].map((entry) => entry.user);
}

const cleanupTimer = setInterval(() => {
  const now = Date.now();
  for (const [key, users] of editing.entries()) {
    for (const [userId, entry] of users.entries()) {
      if (entry.expiresAt <= now) {
        users.delete(userId);
        const [entityType, entityId] = key.split(':');
        publishRealtime('presence.editing', { key, entityType, entityId: Number(entityId), user: entry.user, active: false });
      }
    }
    if (!users.size) editing.delete(key);
  }
}, 15_000);
cleanupTimer.unref?.();
