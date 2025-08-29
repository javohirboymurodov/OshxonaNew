import React from 'react';
import { Card, message as antdMessage } from 'antd';
import { apiService } from '@/services/api';
import { useAuth } from '@/hooks/useAuth';
import { useQuery, useQueryClient } from '@tanstack/react-query';
import { useTable } from '@/hooks/useTable';
import { useFormModal } from '@/hooks/useFormModal';
import CategoriesTable from '@/components/Categories/CategoriesTable';
import CategoryFormModal from '@/components/Categories/CategoryFormModal';
import CategoryStats from '@/components/Categories/CategoryStats';
import PageHeader from '@/components/Common/PageHeader';
import SearchAndFilter from '@/components/Common/SearchAndFilter';
import type { Category } from '@/components/Categories/types';
import { MESSAGES, DEFAULT_PAGE_SIZE } from '@/utils/constants';
import { handleApiError, showSuccess } from '@/utils/helpers';

const CategoriesPage: React.FC = () => {
  const { user } = useAuth() as { user?: { role?: string; branch?: string } };
  const isSuper = String(user?.role || '').toLowerCase() === 'superadmin';
  const branchId = isSuper ? undefined : user?.branch;
  
  // Queries
  const queryClient = useQueryClient();
  
  const branchesQuery = useQuery<{ _id: string; name?: string; title?: string }[]>({
    queryKey: ['branches-select'],
    queryFn: async () => {
      const data = await apiService.getBranches();
      if (Array.isArray(data)) return data as { _id: string; name?: string; title?: string }[];
      return (data?.branches || data?.items || []) as { _id: string; name?: string; title?: string }[];
    },
    enabled: isSuper,
  });

  // Table hook
  const {
    loading,
    items: categories,
    filters,
    updateFilters,
    refresh
  } = useTable<Category>({
    initialPageSize: DEFAULT_PAGE_SIZE,
    fetchFn: async (page, pageSize, filters) => {
      console.log('🏗️ Categories useTable fetchFn called with:', { page, pageSize, filters, branchId, isSuper });
      const params = {
        page,
        limit: pageSize,
        search: filters?.search || '',
        status: filters?.status !== 'all' ? filters?.status : undefined,
        visibility: filters?.visibility !== 'all' ? filters?.visibility : undefined,
        branch: filters?.branch || branchId
      };
      // console.log('📋 Categories fetchFn params:', params);
      const result = await apiService.getCategories(params.page, params.limit, params);
      // console.log('📊 Categories fetchFn result:', result);
      return result;
    }
  });

  // Form modal hook  
  const formModal = useFormModal<Category>({
    onSubmit: async (values, editItem) => {
      try {
        if (editItem) {
          await apiService.updateCategory(editItem._id, values);
          showSuccess(MESSAGES.SUCCESS.UPDATED);
        } else {
          await apiService.createCategory(values);
          showSuccess(MESSAGES.SUCCESS.CREATED);
        }
        refresh();
      } catch (error) {
        handleApiError(error);
      }
    }
  });

  // Actions
  const handleEdit = (category: Category) => {
    formModal.openModal(category);
  };

  const handleDelete = async (categoryId: string) => {
    try {
      await apiService.deleteCategory(categoryId);
      showSuccess(MESSAGES.SUCCESS.DELETED);
      refresh();
    } catch (error) {
      handleApiError(error);
    }
  };

  const toggleStatus = async (categoryId: string) => {
    try {
      await apiService.put(`/categories/${categoryId}/toggle-status`);
      showSuccess('Status yangilandi');
      refresh();
    } catch (error) {
      handleApiError(error);
    }
  };

  const toggleVisibility = async (categoryId: string) => {
    try {
      await apiService.put(`/categories/${categoryId}/toggle-visibility`);
      showSuccess('Ko\'rinish yangilandi');
      refresh();
    } catch (error) {
      handleApiError(error);
    }
  };

  // Filter options
  const filterOptions = [
    {
      key: 'status',
      label: 'Status',
      value: filters.status || 'all',
      options: [
        { label: 'Barchasi', value: 'all' },
        { label: 'Faol', value: 'active' },
        { label: 'Nofaol', value: 'inactive' }
      ],
      onChange: (value: string) => updateFilters({ ...filters, status: value })
    },
    {
      key: 'visibility',
      label: 'Ko\'rinish',
      value: filters.visibility || 'all',
      options: [
        { label: 'Barchasi', value: 'all' },
        { label: 'Ko\'rinadigan', value: 'visible' },
        { label: 'Yashirin', value: 'hidden' }
      ],
      onChange: (value: string) => updateFilters({ ...filters, visibility: value })
    }
  ];

  if (isSuper && branchesQuery.data) {
    filterOptions.push({
      key: 'branch',
      label: 'Filial',
      value: filters.branch || '',
      options: [
        { label: 'Barcha filiallar', value: '' },
        ...branchesQuery.data.map(branch => ({
          label: branch.name || branch.title || 'Noma\'lum',
          value: branch._id
        }))
      ],
      onChange: (value: string) => updateFilters({ ...filters, branch: value })
    });
  }

  return (
    <div>
      {/* Page Header */}
      <PageHeader
        title="Kategoriyalar"
        description="Mahsulot kategoriyalarini boshqaring"
        showAdd={isSuper}
        onAdd={() => formModal.openModal()}
        onRefresh={refresh}
        loading={loading}
        addText="Kategoriya qo'shish"
      />

      {/* Search and Filters */}
      <SearchAndFilter
        searchValue={filters.search || ''}
        onSearchChange={(value) => updateFilters({ ...filters, search: value })}
        searchPlaceholder="Kategoriya nomi bo'yicha qidirish..."
        filters={filterOptions}
      />

      {/* Stats */}
      <CategoryStats categories={categories} />

      {/* Categories Table */}
      <Card>
        <CategoriesTable
          loading={loading}
          data={categories}
          onToggleStatus={toggleStatus}
          onToggleVisibility={toggleVisibility}
          onEdit={isSuper ? handleEdit : () => {}}
          onDelete={isSuper ? handleDelete : () => {}}
          isSuper={isSuper}
          onReorder={async (ids) => {
            try {
              await apiService.post('/categories/reorder', { categoryIds: ids });
              showSuccess('Tartib yangilandi');
              refresh();
            } catch (error) {
              handleApiError(error);
            }
          }}
        />
      </Card>

      {/* Add/Edit Modal */}
      {isSuper && (
        <CategoryFormModal
          open={formModal.open}
          initial={formModal.editItem}
          onCancel={formModal.closeModal}
          onSubmit={formModal.handleSubmit}
        />
      )}
    </div>
  );
};

export default CategoriesPage;