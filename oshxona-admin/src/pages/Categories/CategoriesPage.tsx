import React, { useState, useEffect } from 'react';
import { Card, Button, message as antdMessage, Row, Col, Input, Select } from 'antd';
import { PlusOutlined } from '@ant-design/icons';
import { apiService } from '@/services/api';
import { useAuth } from '@/hooks/useAuth';
import { useQuery, useQueryClient } from '@tanstack/react-query';
import CategoriesTable from '@/components/Categories/CategoriesTable';
import CategoryFormModal from '@/components/Categories/CategoryFormModal';
import CategoryStats from '@/components/Categories/CategoryStats';
import type { Category } from '@/components/Categories/types';

// types are imported from components/Categories/types

const CategoriesPage: React.FC = () => {
  const [categories, setCategories] = useState<Category[]>([]);
  const [allCategories, setAllCategories] = useState<Category[]>([]);
  const { user } = useAuth() as { user?: { role?: string; branch?: string } };
  const isSuper = String(user?.role || '').toLowerCase() === 'superadmin';
  const branchId = isSuper ? undefined : user?.branch;
  const branchesQuery = useQuery<{ _id: string; name?: string; title?: string }[]>({
    queryKey: ['branches-select'],
    queryFn: async () => {
      const data = await apiService.getBranches();
      if (Array.isArray(data)) return data as { _id: string; name?: string; title?: string }[];
      return (data?.branches || data?.items || []) as { _id: string; name?: string; title?: string }[];
    },
    enabled: isSuper,
  });
  const [loading, setLoading] = useState(false);
  const [modalVisible, setModalVisible] = useState(false);
  const [editingCategory, setEditingCategory] = useState<Category | null>(null);
  // Modal ichida o'zining form instance'i boshqariladi
  const [search, setSearch] = useState('');
  const [statusFilter, setStatusFilter] = useState<'all' | 'active' | 'inactive'>('all');
  const [visibilityFilter, setVisibilityFilter] = useState<'all' | 'visible' | 'hidden'>('all');
  const [branchFilter, setBranchFilter] = useState<string>('');

  const queryClient = useQueryClient();
  const categoriesKey = ['categories', { search, branch: branchId }];
  const categoriesQuery = useQuery<Category[]>({
    queryKey: categoriesKey,
    queryFn: async () => {
      const base = `/categories?page=1&limit=1000${search ? `&search=${encodeURIComponent(search)}` : ''}`;
      const url = isSuper && branchFilter ? `${base}&branch=${encodeURIComponent(branchFilter)}` : (!isSuper && branchId ? `${base}&branch=${encodeURIComponent(branchId)}` : base);
      const response = await apiService.get<{ items?: Category[] }>(url);
      return (response.items || []) as Category[];
    },
    placeholderData: [] as Category[],
  });

  useEffect(() => {
    setLoading(categoriesQuery.isLoading);
    const items = (categoriesQuery.data || []) as Category[];
    setAllCategories(items);
    applyClientFilters(items);
  }, [categoriesQuery.isLoading, categoriesQuery.data]);

  useEffect(() => {
    queryClient.invalidateQueries({ queryKey: categoriesKey });
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  useEffect(() => {
    queryClient.invalidateQueries({ queryKey: categoriesKey });
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [search]);

  const applyClientFilters = (source: Category[]) => {
    let data = [...source];
    if (statusFilter !== 'all') {
      const active = statusFilter === 'active';
      data = data.filter(c => !!c.isActive === active);
    }
    if (visibilityFilter !== 'all') {
      const visible = visibilityFilter === 'visible';
      data = data.filter(c => (c.isVisible ?? true) === visible);
    }
    setCategories(data);
  };

  useEffect(() => {
    applyClientFilters(allCategories);
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [statusFilter, visibilityFilter]);

  // Handle form submit
  const handleSubmit = async (values: {
    name: string;
    nameUz: string;
    nameRu: string;
    nameEn: string;
    description?: string;
    isActive: boolean;
    sortOrder?: number;
    image?: { file?: File };
  }) => {
    try {
      const formData = new FormData();
      formData.append('name', values.name);
      formData.append('nameUz', values.nameUz);
      formData.append('nameRu', values.nameRu);
      formData.append('nameEn', values.nameEn);
      formData.append('description', values.description || '');
      formData.append('isActive', String(values.isActive));

      if (values.image && values.image.file) {
        formData.append('image', values.image.file);
      }

      if (editingCategory) {
        await apiService.updateCategory(editingCategory._id, formData);
        antdMessage.success('Kategoriya muvaffaqiyatli yangilandi!');
      } else {
        await apiService.createCategory(formData);
        antdMessage.success('Kategoriya muvaffaqiyatli qo\'shildi!');
      }

      setModalVisible(false);
      setEditingCategory(null);
      queryClient.invalidateQueries({ queryKey: categoriesKey });
    } catch {
      antdMessage.error('Xatolik yuz berdi!');
    }
  };

  // Handle edit
  const handleEdit = (category: Category) => {
    setEditingCategory(category);
    setModalVisible(true);
  };

  // Handle delete
  const handleDelete = async (id: string) => {
    try {
      await apiService.deleteCategory(id);
      antdMessage.success('Kategoriya o\'chirildi!');
      queryClient.invalidateQueries({ queryKey: categoriesKey });
    } catch {
      antdMessage.error('O\'chirishda xatolik!');
    }
  };

  // Toggle status
  const toggleStatus = async (id: string) => {
    try {
      await apiService.toggleCategoryStatus(id);
      antdMessage.success('Status o\'zgartirildi!');
      queryClient.invalidateQueries({ queryKey: categoriesKey });
    } catch {
      antdMessage.error('Status o\'zgartirishda xatolik!');
    }
  };

  // Toggle visibility
  const toggleVisibility = async (id: string) => {
    try {
      await apiService.toggleCategoryVisibility(id);
      antdMessage.success("Ko'rinish o'zgartirildi!");
      queryClient.invalidateQueries({ queryKey: categoriesKey });
    } catch {
      antdMessage.error("Ko'rinishni o'zgartirishda xatolik!");
    }
  };

  // Legacy columns removed; table is now in CategoriesTable

  return (
    <div style={{ padding: 24 }}>
      {/* Header */}
      <Row gutter={[16, 16]} style={{ marginBottom: 24 }}>
        <Col span={18}>
          <h1 style={{ margin: 0, fontSize: 24, fontWeight: 600 }}>
            Kategoriyalar Boshqaruvi
          </h1>
        </Col>
        <Col span={6} style={{ textAlign: 'right' }}>
          {isSuper && (
          <Button
            type="primary"
            icon={<PlusOutlined />}
            onClick={() => {
              setEditingCategory(null);
              setModalVisible(true);
            }}
            size="large"
          >
            Yangi Kategoriya
          </Button>
          )}
        </Col>
      </Row>

      {/* Filter bar */}
      <Card style={{ marginBottom: 16 }}>
        <Row gutter={12}>
          <Col xs={24} md={12} lg={10}>
            <Input
              placeholder="Qidirish (nom)"
              value={search}
              onChange={(e) => setSearch(e.target.value)}
              allowClear
            />
          </Col>
          {isSuper && (
            <Col xs={24} md={6} lg={7}>
              <Select
                placeholder="Filial"
                allowClear
                style={{ width: '100%' }}
                value={branchFilter || undefined}
                onChange={(v) => setBranchFilter(v || '')}
                options={(branchesQuery.data || []).map((b) => ({ value: b._id, label: b.name || b.title || 'Filial' }))}
              />
            </Col>
          )}
          <Col xs={24} md={6} lg={7}>
            <Select
              value={statusFilter}
              onChange={setStatusFilter}
              style={{ width: '100%' }}
              options={[
                { value: 'all', label: 'Barchasi' },
                { value: 'active', label: 'Faol' },
                { value: 'inactive', label: 'Nofaol' }
              ]}
            />
          </Col>
          <Col xs={24} md={6} lg={7}>
            <Select
              value={visibilityFilter}
              onChange={setVisibilityFilter}
              style={{ width: '100%' }}
              options={[
                { value: 'all', label: 'Hammasi' },
                { value: 'visible', label: "Ko'rinadi" },
                { value: 'hidden', label: 'Yashirin' }
              ]}
            />
          </Col>
        </Row>
      </Card>

      {/* Statistics */}
       {isSuper && <CategoryStats categories={categories} />}

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
              antdMessage.success('Tartib yangilandi');
              queryClient.invalidateQueries({ queryKey: categoriesKey });
            } catch {
              antdMessage.error('Tartibni yangilashda xatolik!');
            }
          }}
        />
      </Card>

      {/* Add/Edit Modal */}
      {isSuper && (
      <CategoryFormModal
        open={modalVisible}
        initial={editingCategory}
        onCancel={() => {
          setModalVisible(false);
          setEditingCategory(null);
        }}
        onSubmit={handleSubmit}
      />
      )}
    </div>
  );
};

export default CategoriesPage;