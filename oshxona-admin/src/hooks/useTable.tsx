// Common Table Hook - Takrorlanuvchi table logic uchun
import { useState, useCallback, useEffect } from 'react';
import { message } from 'antd';

interface PaginationState {
  page: number;
  pageSize: number;
  total: number;
}

interface UseTableOptions<T> {
  initialPageSize?: number;
  queryKey?: string;
  fetchFn: (page: number, pageSize: number, filters?: Record<string, any>) => Promise<{
    items: T[];
    pagination?: { page?: number; pageSize?: number; total?: number };
  }>;
}

export function useTable<T>({ initialPageSize = 20, fetchFn }: UseTableOptions<T>) {
  const [loading, setLoading] = useState(false);
  const [items, setItems] = useState<T[]>([]);
  const [pagination, setPagination] = useState<PaginationState>({
    page: 1,
    pageSize: initialPageSize,
    total: 0
  });
  const [filters, setFilters] = useState<Record<string, any>>({});

  const fetchData = useCallback(async (
    page = pagination.page, 
    pageSize = pagination.pageSize, 
    newFilters = filters
  ) => {
    setLoading(true);
    try {
      const result = await fetchFn(page, pageSize, newFilters);
      const list = result.items || [];
      const pag = result.pagination || { total: list.length, page, pageSize };
      
      setItems(list);
      setPagination({
        page: Number(pag.page || page),
        pageSize: Number(pag.pageSize || pageSize),
        total: Number(pag.total || list.length || 0)
      });
    } catch (error) {
      console.error('Table fetch error:', error);
      message.error('Ma\'lumotlarni yuklashda xatolik');
      setItems([]);
      setPagination(prev => ({ ...prev, total: 0 }));
    } finally {
      setLoading(false);
    }
  }, [fetchFn, pagination.page, pagination.pageSize, filters]);

  const updateFilters = useCallback((newFilters: Record<string, any>) => {
    setFilters(newFilters);
    fetchData(1, pagination.pageSize, newFilters);
  }, [fetchData, pagination.pageSize]);

  const changePage = useCallback((page: number, pageSize?: number) => {
    const newPageSize = pageSize || pagination.pageSize;
    setPagination(prev => ({ ...prev, page, pageSize: newPageSize }));
    fetchData(page, newPageSize, filters);
  }, [fetchData, pagination.pageSize, filters]);

  const refresh = useCallback(() => {
    fetchData(pagination.page, pagination.pageSize, filters);
  }, [fetchData, pagination.page, pagination.pageSize, filters]);

  // Initial data load
  useEffect(() => {
    console.log('🚀 useTable: Initial data load triggered');
    fetchData(1, initialPageSize, {});
  }, []);

  return {
    loading,
    items,
    pagination,
    filters,
    fetchData,
    updateFilters,
    changePage,
    refresh,
    setItems
  };
}
