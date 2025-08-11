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

export const useProducts = () => {
  const [products, setProducts] = useState<Product[]>([]);
  const [loading, setLoading] = useState(true);

  const token = localStorage.getItem('token');

  const fetchProducts = async (
    filters?: { search?: string; category?: string; status?: 'active' | 'inactive' | 'all' },
    options?: { silent?: boolean }
  ) => {
    try {
      if (!options?.silent) setLoading(true);
      let url = 'http://localhost:5000/api/admin/products';
      const params: string[] = [];
      if (filters?.category && filters.category !== 'all') params.push(`category=${encodeURIComponent(filters.category)}`);
      if (filters?.search) params.push(`search=${encodeURIComponent(filters.search)}`);
      if (params.length) url += `?${params.join('&')}`;

      const response = await fetch(url, {
        headers: {
          'Authorization': `Bearer ${token}`,
          'Content-Type': 'application/json'
        }
      });

      if (response.ok) {
        const data = await response.json();
        let items: Product[] = data.data?.items || [];
        // Client-side status filter if requested
        if (filters?.status && filters.status !== 'all') {
          const isActive = filters.status === 'active';
          items = items.filter(p => Boolean(p.isActive) === isActive);
        }
        setProducts(items);
      } else {
        throw new Error('Mahsulotlarni yuklashda xatolik');
      }
    } catch (error) {
      console.error('Fetch products error:', error);
      throw error;
    } finally {
      if (!options?.silent) setLoading(false);
    }
  };

  const createProduct = async (formData: FormData, selectedFile: File | null) => {
    const submitData = new FormData();
    submitData.append('name', formData.name.trim());
    submitData.append('description', formData.description.trim());
    submitData.append('price', formData.price.toString());
    submitData.append('categoryId', formData.categoryId);
    submitData.append('isActive', formData.isActive.toString());
    
    if (selectedFile) {
      submitData.append('image', selectedFile);
    }

    const response = await fetch('http://localhost:5000/api/admin/products', {
      method: 'POST',
      headers: {
        'Authorization': `Bearer ${token}`
      },
      body: submitData
    });

    if (!response.ok) {
      const result = await response.json();
      throw new Error(result.message || 'Mahsulot yaratishda xatolik');
    }
  };

  const updateProduct = async (id: string, formData: FormData, selectedFile: File | null) => {
    const submitData = new FormData();
    submitData.append('name', formData.name.trim());
    submitData.append('description', formData.description.trim());
    submitData.append('price', formData.price.toString());
    submitData.append('categoryId', formData.categoryId);
    submitData.append('isActive', formData.isActive.toString());
    
    if (selectedFile) {
      submitData.append('image', selectedFile);
    }

    const response = await fetch(`http://localhost:5000/api/admin/products/${id}`, {
      method: 'PUT',
      headers: {
        'Authorization': `Bearer ${token}`
      },
      body: submitData
    });

    if (!response.ok) {
      const result = await response.json();
      throw new Error(result.message || 'Mahsulotni yangilashda xatolik');
    }
  };

  const deleteProduct = async (id: string) => {
    const response = await fetch(`http://localhost:5000/api/admin/products/${id}`, {
      method: 'DELETE',
      headers: {
        'Authorization': `Bearer ${token}`,
        'Content-Type': 'application/json'
      }
    });

    if (!response.ok) {
      const result = await response.json();
      throw new Error(result.message || 'Mahsulotni o\'chirishda xatolik');
    }
  };

  const toggleProductStatus = async (id: string) => {
    const response = await fetch(`http://localhost:5000/api/admin/products/${id}/toggle-status`, {
      method: 'PATCH',
      headers: {
        'Authorization': `Bearer ${token}`,
        'Content-Type': 'application/json'
      }
    });
    if (!response.ok) {
      const result = await response.json();
      throw new Error(result.message || 'Holatni o\'zgartirishda xatolik');
    }
  };

  return {
    products,
    loading,
    fetchProducts,
    createProduct,
    updateProduct,
    deleteProduct,
    toggleProductStatus
  };
};

// Export types for reuse
export type { Product, FormData };