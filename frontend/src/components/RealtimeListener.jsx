import { useEffect, useRef } from 'react';
import { resolveApiUrl } from '../lib/api.js';

export default function RealtimeListener({ token, onEvent }) {
  const onEventRef = useRef(onEvent);

  useEffect(() => {
    onEventRef.current = onEvent;
  }, [onEvent]);

  useEffect(() => {
    if (!token) return undefined;

    const controller = new AbortController();
    let retry;

    const connect = async () => {
      try {
        const response = await fetch(resolveApiUrl('/api/realtime/events'), {
          headers: {
            Authorization: `Bearer ${token}`,
            Accept: 'text/event-stream',
          },
          signal: controller.signal,
        });

        if (!response.ok || !response.body) throw new Error('Realtime ulanmagan');

        const reader = response.body.getReader();
        const decoder = new TextDecoder();
        let buffer = '';

        while (!controller.signal.aborted) {
          const { value, done } = await reader.read();
          if (done) break;
          buffer += decoder.decode(value, { stream: true });
          const chunks = buffer.split('\n\n');
          buffer = chunks.pop() || '';

          chunks.forEach((chunk) => {
            const lines = chunk.split('\n');
            const eventName = lines.find((line) => line.startsWith('event:'))?.slice(6).trim();
            const dataLine = lines.find((line) => line.startsWith('data:'))?.slice(5).trim();
            if (!dataLine || ['ping', 'connected'].includes(eventName)) return;
            try {
              onEventRef.current?.(eventName, JSON.parse(dataLine));
            } catch {
              // Noto‘g‘ri SSE paketi panel ishini to‘xtatmasligi kerak.
            }
          });
        }

        if (!controller.signal.aborted) retry = setTimeout(connect, 5000);
      } catch {
        if (!controller.signal.aborted) retry = setTimeout(connect, 5000);
      }
    };

    void connect();
    return () => {
      controller.abort();
      clearTimeout(retry);
    };
  }, [token]);

  return null;
}
