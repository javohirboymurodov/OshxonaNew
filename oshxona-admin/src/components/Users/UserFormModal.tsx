import React, { useEffect } from 'react';
import { Modal, Form, Input, Select, Switch, Row, Col, Button } from 'antd';

const { Option } = Select;

interface Props {
  open: boolean;
  isEdit: boolean;
  initialValues?: any;
  onCancel: () => void;
  onSubmit: (values: any) => void;
}

const UserFormModal: React.FC<Props> = ({ open, isEdit, initialValues, onCancel, onSubmit }) => {
  const [form] = Form.useForm();

  // Keep form in sync when opening/editing
  useEffect(() => {
    if (open) {
      form.resetFields();
      if (initialValues) {
        form.setFieldsValue(initialValues);
      }
    }
  }, [open, initialValues, form]);

  return (
    <Modal title={isEdit ? 'Foydalanuvchini tahrirlash' : 'Yangi foydalanuvchi yaratish'} open={open} onCancel={() => { onCancel(); form.resetFields(); }} footer={null} width={500}>
      <Form form={form} layout="vertical" initialValues={initialValues} onFinish={onSubmit}>
        <Row gutter={16}>
          <Col span={12}>
            <Form.Item label="Ism" name="firstName" rules={[{ required: true, message: 'Ismni kiriting!' }]}>
              <Input placeholder="Ism" />
            </Form.Item>
          </Col>
          <Col span={12}>
            <Form.Item label="Familiya" name="lastName" rules={isEdit ? [] : [{ required: true, message: 'Familiyani kiriting!' }]}>
              <Input placeholder="Familiya" />
            </Form.Item>
          </Col>
        </Row>

        <Form.Item label="Email" name="email" rules={[{ type: 'email', message: 'To\'g\'ri email kiriting!' }]}>
          <Input placeholder="email@example.com" />
        </Form.Item>

        <Form.Item label="Telefon" name="phone">
          <Input placeholder="+998901234567" />
        </Form.Item>

        <Form.Item label="Rol" name="role" rules={[{ required: true, message: 'Rolni tanlang!' }]}>
          <Select placeholder="Rolni tanlang">
            <Option value="admin">Admin</Option>
            <Option value="courier">Kuryer</Option>
            <Option value="user">Foydalanuvchi</Option>
          </Select>
        </Form.Item>

        <Row gutter={16}>
          <Col span={12}>
            <Form.Item label="Faol" name="isActive" valuePropName="checked">
              <Switch />
            </Form.Item>
          </Col>
          <Col span={12}>
            <Form.Item label="Bloklangan" name="isBlocked" valuePropName="checked">
              <Switch />
            </Form.Item>
          </Col>
        </Row>

        <Row justify="end" gutter={16}>
          <Col><Button onClick={() => { onCancel(); form.resetFields(); }}>Bekor qilish</Button></Col>
          <Col><Button type="primary" htmlType="submit">{isEdit ? 'Yangilash' : 'Yaratish'}</Button></Col>
        </Row>
      </Form>
    </Modal>
  );
};

export default UserFormModal;


