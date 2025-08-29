import React from 'react';
import { Modal, Form, Input, Switch, Space, Button, Row, Col, InputNumber } from 'antd';
import { Category } from './types';

interface Props {
  open: boolean;
  initial?: Partial<Category> | null;
  onCancel: () => void;
  onSubmit: (values: {
    name: string;
    nameUz: string;
    nameRu: string;
    nameEn: string;
    description?: string;
    isActive: boolean;
    sortOrder?: number;
    image?: { file?: File };
  }) => void | Promise<void>;
}

const CategoryFormModal: React.FC<Props> = ({ open, initial, onCancel, onSubmit }) => {
  const [form] = Form.useForm();

  React.useEffect(() => {
    if (open) {
      form.resetFields();
      if (initial) {
        form.setFieldsValue({
          name: initial.name,
          nameUz: initial.nameUz,
          nameRu: initial.nameRu,
          nameEn: initial.nameEn,
          description: initial.description,
          isActive: initial.isActive,
          sortOrder: initial.sortOrder
        });
      } else {
        form.setFieldsValue({ isActive: true });
      }
    }
  }, [open, initial, form]);

  return (
    <Modal
      title={initial? 'Kategoriyani Tahrirlash' : 'Yangi Kategoriya Qo\'shish'}
      open={open}
      onCancel={onCancel}
      footer={null}
      width={600}
    >
      <Form form={form} layout="vertical" onFinish={onSubmit}>
        <Row gutter={16}>
          <Col span={12}>
            <Form.Item name="nameUz" label="Nom (O'zbek)" rules={[{ required: true, message: "O'zbek nomini kiriting!" }]}>
              <Input placeholder="Kategoriya nomi" />
            </Form.Item>
          </Col>
          <Col span={12}>
            <Form.Item name="nameRu" label="Nom (Rus)" rules={[{ required: true, message: 'Rus nomini kiriting!' }]}>
              <Input placeholder="Название категории" />
            </Form.Item>
          </Col>
        </Row>

        <Row gutter={16}>
          <Col span={12}>
            <Form.Item name="nameEn" label="Nom (Ingliz)" rules={[{ required: true, message: 'Ingliz nomini kiriting!' }]}>
              <Input placeholder="Category name" />
            </Form.Item>
          </Col>
          <Col span={12}>
            <Form.Item name="name" label="Asosiy nom" rules={[{ required: true, message: 'Asosiy nomini kiriting!' }]}>
              <Input placeholder="Asosiy nom" />
            </Form.Item>
          </Col>
        </Row>

        <Form.Item name="description" label="Tavsif">
          <Input.TextArea rows={3} placeholder="Kategoriya haqida qisqacha ma'lumot..." />
        </Form.Item>

        <Row gutter={16}>
          <Col span={12}>
            <Form.Item name="isActive" label="Status" valuePropName="checked">
              <Switch checkedChildren="Faol" unCheckedChildren="Nofaol" />
            </Form.Item>
          </Col>
          <Col span={12}>
            <Form.Item name="sortOrder" label="Tartib raqami">
              <InputNumber min={0} placeholder="0" style={{ width: '100%' }} />
            </Form.Item>
          </Col>
        </Row>

        <Form.Item style={{ marginBottom: 0, textAlign: 'right' }}>
          <Space>
            <Button onClick={onCancel}>Bekor qilish</Button>
            <Button type="primary" htmlType="submit">{initial ? 'Yangilash' : "Qo'shish"}</Button>
          </Space>
        </Form.Item>
      </Form>
    </Modal>
  );
};

export default CategoryFormModal;


