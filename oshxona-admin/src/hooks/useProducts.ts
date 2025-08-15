import { useState } from 'react';

interface Product {
  _id: string;
  name: string;
  description: string;
  price: number;
  categoryId: {
    _id: string;
    name: string;
    emoji: string;
  };
  isActive: boolean;
  image?: string;
  imageFileId?: string;
  createdAt: string;
}

interface FormData {
  name: string;
  description: string;
  price: number;
  categoryId: string;
  isActive: boolean;
}

// Legacy hook — endi sahifa React Query orqali ishlaydi. Qolgan joylar import qilsa, kompilyatsiya xatoliksiz bo'lishi uchun bo'sh stub qaytaramiz.
export const useProducts = () => {
  return {
    products: [] as Product[],
    loading: false,
    fetchProducts: async () => {},
    createProduct: async (_formData: FormData, _file: File | null) => {},
    updateProduct: async (_id: string, _formData: FormData, _file: File | null) => {},
    deleteProduct: async (_id: string) => {},
    toggleProductStatus: async (_id: string) => {},
  };
};

// Export types for reuse
export type { Product, FormData };