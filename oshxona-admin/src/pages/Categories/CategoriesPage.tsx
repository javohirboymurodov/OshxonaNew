import React, { useState, useEffect } from 'react';
import { Card, Button, message as antdMessage, Row, Col, Input, Select } from 'antd';
import { PlusOutlined } from '@ant-design/icons';
import { apiService } from '@/services/api';
import CategoriesTable from '@/components/Categories/CategoriesTable';
import CategoryFormModal from '@/components/Categories/CategoryFormModal';
import CategoryStats from '@/components/Categories/CategoryStats';
import type { Category } from '@/components/Categories/types';

// types are imported from components/Categories/types

const CategoriesPage: React.FC = () => {
  const [categories, setCategories] = useState<Category[]>([]);
  const [allCategories, setAllCategories] = useState<Category[]>([]);
  const [loading, setLoading] = useState(false);
  const [modalVisible, setModalVisible] = useState(false);
  const [editingCategory, setEditingCategory] = useState<Category | null>(null);
  // Modal ichida o'zining form instance'i boshqariladi
  const [search, setSearch] = useState('');
  const [statusFilter, setStatusFilter] = useState<'all' | 'active' | 'inactive'>('all');
  const [visibilityFilter, setVisibilityFilter] = useState<'all' | 'visible' | 'hidden'>('all');

  // Fetch categories
  const fetchCategories = async () => {
    setLoading(true);
    try {
      const response = await apiService.getCategories(undefined, undefined, search);
      const items: Category[] = response.items || [];
      setAllCategories(items);
      applyClientFilters(items);
    } catch (error) {
      console.error('Categories fetch error:', error);
      antdMessage.error('Kategoriyalarni yuklashda xatolik!');
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchCategories();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  useEffect(() => {
    // live search and filters
    fetchCategories();
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
      fetchCategories();
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
      fetchCategories();
    } catch {
      antdMessage.error('O\'chirishda xatolik!');
    }
  };

  // Toggle status
  const toggleStatus = async (id: string) => {
    try {
      await apiService.toggleCategoryStatus(id);
      antdMessage.success('Status o\'zgartirildi!');
      fetchCategories();
    } catch {
      antdMessage.error('Status o\'zgartirishda xatolik!');
    }
  };

  // Toggle visibility
  const toggleVisibility = async (id: string) => {
    try {
      await apiService.toggleCategoryVisibility(id);
      antdMessage.success("Ko'rinish o'zgartirildi!");
      fetchCategories();
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
      <CategoryStats categories={categories} />

      {/* Categories Table */}
      <Card>
        <CategoriesTable
          loading={loading}
          data={categories}
          onToggleStatus={toggleStatus}
          onToggleVisibility={toggleVisibility}
          onEdit={handleEdit}
          onDelete={handleDelete}
          onReorder={async (ids) => {
            try {
              await apiService.post('/categories/reorder', { categoryIds: ids });
              antdMessage.success('Tartib yangilandi');
              fetchCategories();
            } catch {
              antdMessage.error('Tartibni yangilashda xatolik!');
            }
          }}
        />
      </Card>

      {/* Add/Edit Modal */}
      <CategoryFormModal
        open={modalVisible}
        initial={editingCategory}
        onCancel={() => {
          setModalVisible(false);
          setEditingCategory(null);
        }}
        onSubmit={handleSubmit}
      />
    </div>
  );
};

export default CategoriesPage;