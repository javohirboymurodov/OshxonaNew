import { useState, useEffect } from 'react';

interface Category {
  _id: string;
  name: string;
  emoji: string;
}

// Legacy hook — endi sahifalar React Query ishlatyapti. Orqaga moslik uchun bo'sh stub.
export const useCategories = () => {
  return { categories: [] as Category[], loading: false, fetchCategories: async () => {} };
};

export type { Category };