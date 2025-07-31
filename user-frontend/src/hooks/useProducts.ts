import { useState, useEffect } from 'react';
import { useQuery } from 'react-query';
import { Product, ApiResponse, PaginatedResponse } from '@/types';

const fetchProducts = async (): Promise<Product[]> => {
  const response = await fetch('/api/products');
  if (!response.ok) {
    throw new Error('Failed to fetch products');
  }
  const data: ApiResponse<Product[]> = await response.json();
  return data.data || [];
};

export const useProducts = () => {
  return useQuery<Product[], Error>('products', fetchProducts, {
    staleTime: 5 * 60 * 1000, // 5 minutes
    cacheTime: 10 * 60 * 1000, // 10 minutes
  });
};

export const useProduct = (productId: string) => {
  const fetchProduct = async (): Promise<Product> => {
    const response = await fetch(`/api/products/${productId}`);
    if (!response.ok) {
      throw new Error('Failed to fetch product');
    }
    const data: ApiResponse<Product> = await response.json();
    if (!data.data) {
      throw new Error('Product not found');
    }
    return data.data;
  };

  return useQuery<Product, Error>(['product', productId], fetchProduct, {
    enabled: !!productId,
    staleTime: 5 * 60 * 1000,
  });
};

export const useProductsByCategory = (categoryId: string) => {
  const fetchProductsByCategory = async (): Promise<Product[]> => {
    const response = await fetch(`/api/products?category=${categoryId}`);
    if (!response.ok) {
      throw new Error('Failed to fetch products');
    }
    const data: ApiResponse<Product[]> = await response.json();
    return data.data || [];
  };

  return useQuery<Product[], Error>(
    ['products', 'category', categoryId],
    fetchProductsByCategory,
    {
      enabled: !!categoryId && categoryId !== 'all',
      staleTime: 5 * 60 * 1000,
    }
  );
};

export const useSearchProducts = (query: string) => {
  const fetchSearchResults = async (): Promise<Product[]> => {
    const response = await fetch(`/api/products/search?q=${encodeURIComponent(query)}`);
    if (!response.ok) {
      throw new Error('Failed to search products');
    }
    const data: ApiResponse<Product[]> = await response.json();
    return data.data || [];
  };

  return useQuery<Product[], Error>(
    ['products', 'search', query],
    fetchSearchResults,
    {
      enabled: !!query && query.length > 2,
      staleTime: 2 * 60 * 1000, // 2 minutes for search results
    }
  );
};
