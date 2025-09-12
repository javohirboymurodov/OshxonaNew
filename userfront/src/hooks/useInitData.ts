import { useState, useEffect } from 'react';

declare global {
  interface Window { Telegram?: any }
}

export function useInitData() {
  const [telegramId, setTelegramId] = useState<string | null>(null);
  
  useEffect(() => {
    try {
      const tg = window.Telegram?.WebApp;
      tg?.ready?.();
      const initDataUnsafe = tg?.initDataUnsafe;
      const id = initDataUnsafe?.user?.id ? String(initDataUnsafe.user.id) : null;
      
      // Fallback: allow testing via query param if not inside Telegram
      const url = new URL(window.location.href);
      const qpId = url.searchParams.get('telegramId') || url.searchParams.get('tgId');
      setTelegramId(id || qpId || 'test_user_123'); // Test fallback for development
    } catch {
      try {
        const url = new URL(window.location.href);
        const qpId = url.searchParams.get('telegramId') || url.searchParams.get('tgId');
        setTelegramId(qpId || 'test_user_123'); // Test fallback for development
      } catch {
        setTelegramId('test_user_123'); // Final fallback
      }
    }
  }, []);
  
  return telegramId;
}
