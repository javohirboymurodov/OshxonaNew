import { useState, useEffect } from 'react';

declare global {
  interface Window { Telegram?: any }
}

export function useInitData() {
  const [telegramId, setTelegramId] = useState<string | null>(null);
  const [isValidTelegram, setIsValidTelegram] = useState<boolean>(false);
  
  useEffect(() => {
    try {
      const tg = window.Telegram?.WebApp;
      
      if (tg) {
        // Telegram WebApp mavjud
        tg.ready();
        const initDataUnsafe = tg.initDataUnsafe;
        const id = initDataUnsafe?.user?.id ? String(initDataUnsafe.user.id) : null;
        
        if (id) {
          setTelegramId(id);
          setIsValidTelegram(true);
          console.log('✅ Valid Telegram WebApp detected, ID:', id);
        } else {
          console.warn('⚠️ Telegram WebApp detected but no user ID');
          setIsValidTelegram(false);
        }
      } else {
        // Telegram WebApp yo'q - faqat test uchun
        const url = new URL(window.location.href);
        const qpId = url.searchParams.get('telegramId') || url.searchParams.get('tgId');
        
        if (qpId) {
          setTelegramId(qpId);
          setIsValidTelegram(false); // Test mode
          console.log('🧪 Test mode with ID:', qpId);
        } else {
          console.warn('❌ Not in Telegram WebApp and no test ID provided');
          setIsValidTelegram(false);
        }
      }
    } catch (error) {
      console.error('❌ Error initializing Telegram WebApp:', error);
      setIsValidTelegram(false);
    }
  }, []);
  
  return { telegramId, isValidTelegram };
}
