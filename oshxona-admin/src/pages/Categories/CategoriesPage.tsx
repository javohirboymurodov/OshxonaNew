import React, { useState, useEffect } from 'react';
import {
  Card,
  Table,
  Button,
  Space,
  Tag,
  Modal,
  Form,
  Input,
  Switch,
  Upload,
  message,
  Popconfirm,
  Row,
  Col,
  Statistic
} from 'antd';
import {
  PlusOutlined,
  EditOutlined,
  DeleteOutlined,
  UploadOutlined,
  EyeOutlined,
  EyeInvisibleOutlined
} from '@ant-design/icons';
import { apiService } from '@/services/api';

interface Category {
  _id: string;
  name: string;
  nameUz: string;
  nameRu: string;
  nameEn: string;
  description?: string;
  image?: string;
  isActive: boolean;
  order: number;
  createdAt: string;
}

const CategoriesPage: React.FC = () => {
  const [categories, setCategories] = useState<Category[]>([]);
  const [loading, setLoading] = useState(false);
  const [modalVisible, setModalVisible] = useState(false);
  const [editingCategory, setEditingCategory] = useState<Category | null>(null);
  const [form] = Form.useForm();

  // Fetch categories
  const fetchCategories = async () => {
    setLoading(true);
    try {
      const response = await apiService.getCategories();
      setCategories(response.items || []);
    } catch (error) {
      message.error('Kategoriyalarni yuklashda xatolik!');
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchCategories();
  }, []);

  // Handle form submit
  const handleSubmit = async (values: any) => {
    try {
      const formData = new FormData();
      formData.append('name', values.name);
      formData.append('nameUz', values.nameUz);
      formData.append('nameRu', values.nameRu);
      formData.append('nameEn', values.nameEn);
      formData.append('description', values.description || '');
      formData.append('isActive', values.isActive);

      if (values.image && values.image.file) {
        formData.append('image', values.image.file);
      }

      if (editingCategory) {
        await apiService.updateCategory(editingCategory._id, formData);
        message.success('Kategoriya muvaffaqiyatli yangilandi!');
      } else {
        await apiService.createCategory(formData);
        message.success('Kategoriya muvaffaqiyatli qo\'shildi!');
      }

      setModalVisible(false);
      setEditingCategory(null);
      form.resetFields();
      fetchCategories();
    } catch (error) {
      message.error('Xatolik yuz berdi!');
    }
  };

  // Handle edit
  const handleEdit = (category: Category) => {
    setEditingCategory(category);
    form.setFieldsValue({
      name: category.name,
      nameUz: category.nameUz,
      nameRu: category.nameRu,
      nameEn: category.nameEn,
      description: category.description,
      isActive: category.isActive
    });
    setModalVisible(true);
  };

  // Handle delete
  const handleDelete = async (id: string) => {
    try {
      await apiService.deleteCategory(id);
      message.success('Kategoriya o\'chirildi!');
      fetchCategories();
    } catch (error) {
      message.error('O\'chirishda xatolik!');
    }
  };

  // Toggle status
  const toggleStatus = async (id: string) => {
    try {
      await apiService.toggleCategoryStatus(id);
      message.success('Status o\'zgartirildi!');
      fetchCategories();
    } catch (error) {
      message.error('Status o\'zgartirishda xatolik!');
    }
  };

  const columns = [
    {
      title: 'Nom (O\'zbek)',
      dataIndex: 'nameUz',
      key: 'nameUz',
    },
    {
      title: 'Nom (Rus)',
      dataIndex: 'nameRu',
      key: 'nameRu',
    },
    {
      title: 'Nom (Ingliz)',
      dataIndex: 'nameEn',
      key: 'nameEn',
    },
    {
      title: 'Status',
      dataIndex: 'isActive',
      key: 'isActive',
      render: (isActive: boolean, record: Category) => (
        <Switch
          checked={isActive}
          onChange={() => toggleStatus(record._id)}
          checkedChildren={<EyeOutlined />}
          unCheckedChildren={<EyeInvisibleOutlined />}
        />
      )
    },
    {
      title: 'Tartib',
      dataIndex: 'order',
      key: 'order',
      width: 80,
    },
    {
      title: 'Amallar',
      key: 'actions',
      width: 150,
      render: (_, record: Category) => (
        <Space>
          <Button
            type="primary"
            size="small"
            icon={<EditOutlined />}
            onClick={() => handleEdit(record)}
          >
            Tahrirlash
          </Button>
          <Popconfirm
            title="Bu kategoriyani o'chirishni xohlaysizmi?"
            onConfirm={() => handleDelete(record._id)}
            okText="Ha"
            cancelText="Yo'q"
          >
            <Button
              danger
              size="small"
              icon={<DeleteOutlined />}
            >
              O'chirish
            </Button>
          </Popconfirm>
        </Space>
      )
    }
  ];

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
              form.resetFields();
              setModalVisible(true);
            }}
            size="large"
          >
            Yangi Kategoriya
          </Button>
        </Col>
      </Row>

      {/* Statistics */}
      <Row gutter={16} style={{ marginBottom: 24 }}>
        <Col span={8}>
          <Card>
            <Statistic
              title="Jami Kategoriyalar"
              value={categories.length}
              valueStyle={{ color: '#1890ff' }}
            />
          </Card>
        </Col>
        <Col span={8}>
          <Card>
            <Statistic
              title="Faol Kategoriyalar"
              value={categories.filter(c => c.isActive).length}
              valueStyle={{ color: '#52c41a' }}
            />
          </Card>
        </Col>
        <Col span={8}>
          <Card>
            <Statistic
              title="Nofaol Kategoriyalar"
              value={categories.filter(c => !c.isActive).length}
              valueStyle={{ color: '#ff4d4f' }}
            />
          </Card>
        </Col>
      </Row>

      {/* Categories Table */}
      <Card>
        <Table
          columns={columns}
          dataSource={categories}
          rowKey="_id"
          loading={loading}
          pagination={{
            pageSize: 10,
            showSizeChanger: true,
            showQuickJumper: true,
            showTotal: (total) => `Jami ${total} ta kategoriya`
          }}
        />
      </Card>

      {/* Add/Edit Modal */}
      <Modal
        title={editingCategory ? 'Kategoriyani Tahrirlash' : 'Yangi Kategoriya Qo\'shish'}
        open={modalVisible}
        onCancel={() => {
          setModalVisible(false);
          setEditingCategory(null);
          form.resetFields();
        }}
        footer={null}
        width={600}
      >
        <Form
          form={form}
          layout="vertical"
          onFinish={handleSubmit}
          initialValues={{ isActive: true }}
        >
          <Row gutter={16}>
            <Col span={12}>
              <Form.Item
                name="nameUz"
                label="Nom (O'zbek)"
                rules={[{ required: true, message: 'O\'zbek nomini kiriting!' }]}
              >
                <Input placeholder="Kategoriya nomi" />
              </Form.Item>
            </Col>
            <Col span={12}>
              <Form.Item
                name="nameRu"
                label="Nom (Rus)"
                rules={[{ required: true, message: 'Rus nomini kiriting!' }]}
              >
                <Input placeholder="Название категории" />
              </Form.Item>
            </Col>
          </Row>

          <Row gutter={16}>
            <Col span={12}>
              <Form.Item
                name="nameEn"
                label="Nom (Ingliz)"
                rules={[{ required: true, message: 'Ingliz nomini kiriting!' }]}
              >
                <Input placeholder="Category name" />
              </Form.Item>
            </Col>
            <Col span={12}>
              <Form.Item
                name="name"
                label="Asosiy nom"
                rules={[{ required: true, message: 'Asosiy nomini kiriting!' }]}
              >
                <Input placeholder="Asosiy nom" />
              </Form.Item>
            </Col>
          </Row>

          <Form.Item
            name="description"
            label="Tavsif"
          >
            <Input.TextArea
              rows={3}
              placeholder="Kategoriya haqida qisqacha ma'lumot..."
            />
          </Form.Item>

          <Row gutter={16}>
            <Col span={12}>
              <Form.Item
                name="isActive"
                label="Status"
                valuePropName="checked"
              >
                <Switch
                  checkedChildren="Faol"
                  unCheckedChildren="Nofaol"
                />
              </Form.Item>
            </Col>
          </Row>

          <Form.Item style={{ marginBottom: 0, textAlign: 'right' }}>
            <Space>
              <Button
                onClick={() => {
                  setModalVisible(false);
                  setEditingCategory(null);
                  form.resetFields();
                }}
              >
                Bekor qilish
              </Button>
              <Button type="primary" htmlType="submit">
                {editingCategory ? 'Yangilash' : 'Qo\'shish'}
              </Button>
            </Space>
          </Form.Item>
        </Form>
      </Modal>
    </div>
  );
};

export default CategoriesPage;