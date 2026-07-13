import { useEffect, useRef } from 'react';
import { apiRequest, authHeaders } from '../lib/api.js';

function urlBase64ToUint8Array(value) {
  const padding = '='.repeat((4 - (value.length % 4)) % 4);
  const base64 = (value + padding).replace(/-/g, '+').replace(/_/g, '/');
  const raw = atob(base64);
  return Uint8Array.from([...raw].map((character) => character.charCodeAt(0)));
}

export default function PushNotificationManager({ session, notify }) {
  const configRef = useRef({ enabled: false, publicKey: '' });
  const headers = authHeaders(session.token);

  useEffect(() => {
    let cancelled = false;

    const reportState = (extra = {}) => {
      window.dispatchEvent(new CustomEvent('aloo:push-state', {
        detail: {
          supported: 'serviceWorker' in navigator && 'PushManager' in window && 'Notification' in window,
          permission: 'Notification' in window ? Notification.permission : 'unsupported',
          serverEnabled: configRef.current.enabled,
          ...extra,
        },
      }));
    };

    const loadConfig = async () => {
      try {
        const config = await apiRequest('/api/notifications/push/config', { headers });
        if (cancelled) return;
        configRef.current = config;
        reportState();
        if (config.enabled && Notification.permission === 'granted') await ensureSubscription(false);
      } catch {
        reportState({ serverEnabled: false });
      }
    };

    const ensureSubscription = async (askPermission = true) => {
      if (!('serviceWorker' in navigator) || !('PushManager' in window) || !('Notification' in window)) {
        notify('Bu brauzer push bildirishnomalarini qo‘llamaydi.');
        reportState();
        return null;
      }
      if (!configRef.current.enabled || !configRef.current.publicKey) {
        notify('Backend’da VAPID kalitlari hali sozlanmagan. Panel ichidagi bildirishnomalar ishlashda davom etadi.');
        reportState();
        return null;
      }

      let permission = Notification.permission;
      if (permission === 'default' && askPermission) permission = await Notification.requestPermission();
      if (permission !== 'granted') {
        if (askPermission) notify('Brauzer push bildirishnomalariga ruxsat berilmadi.');
        reportState({ permission });
        return null;
      }

      const registration = await navigator.serviceWorker.ready;
      let subscription = await registration.pushManager.getSubscription();
      if (!subscription) {
        subscription = await registration.pushManager.subscribe({
          userVisibleOnly: true,
          applicationServerKey: urlBase64ToUint8Array(configRef.current.publicKey),
        });
      }
      await apiRequest('/api/notifications/push/subscribe', {
        method: 'POST',
        headers,
        body: JSON.stringify(subscription.toJSON()),
      });
      reportState({ subscribed: true, permission });
      if (askPermission) notify('Push bildirishnomalari yoqildi.');
      return subscription;
    };

    const disablePush = async () => {
      try {
        const registration = await navigator.serviceWorker.ready;
        const subscription = await registration.pushManager.getSubscription();
        if (subscription) {
          await apiRequest('/api/notifications/push/unsubscribe', {
            method: 'POST',
            headers,
            body: JSON.stringify({ endpoint: subscription.endpoint }),
          }).catch(() => {});
          await subscription.unsubscribe();
        }
        reportState({ subscribed: false });
        notify('Push bildirishnomalari o‘chirildi.');
      } catch (error) {
        notify(error.message || 'Push bildirishnomasini o‘chirib bo‘lmadi.');
      }
    };

    const testPush = async () => {
      try {
        await ensureSubscription(true);
        const result = await apiRequest('/api/notifications/push/test', { method: 'POST', headers, body: '{}' });
        if (!result.sent) notify('Push subscription topilmadi. Avval pushni yoqing.');
      } catch (error) {
        notify(error.message);
      }
    };

    const enableHandler = () => void ensureSubscription(true).catch((error) => notify(error.message));
    const disableHandler = () => void disablePush();
    const testHandler = () => void testPush();
    window.addEventListener('aloo:enable-push', enableHandler);
    window.addEventListener('aloo:disable-push', disableHandler);
    window.addEventListener('aloo:test-push', testHandler);
    void loadConfig();

    return () => {
      cancelled = true;
      window.removeEventListener('aloo:enable-push', enableHandler);
      window.removeEventListener('aloo:disable-push', disableHandler);
      window.removeEventListener('aloo:test-push', testHandler);
    };
  }, [session.token, notify]);

  return null;
}
