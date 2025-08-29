import React, { useEffect } from 'react';
import { Modal, Form, Input, Select, Switch, Row, Col, Button } from 'antd';
import apiService from '@/services/api';

const { Option } = Select;

interface Props {
  open: boolean;
  isEdit: boolean;
  initialValues?: Record<string, unknown>;
  onCancel: () => void;
  onSubmit: (values: Record<string, unknown>) => void;
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

  const role = Form.useWatch('role', form);
  const [branches, setBranches] = React.useState<Array<{ _id: string; name?: string }>>([]);
  useEffect(() => {
    (async () => {
      try {
        const data = await apiService.getBranches();
        const list = Array.isArray(data) ? data : ((data as { branches?: Array<{ _id: string; name?: string }>; items?: Array<{ _id: string; name?: string }> }).branches || (data as { items?: Array<{ _id: string; name?: string }> }).items || []);
        setBranches(list as Array<{ _id: string; name?: string }>);
      } catch {
        // ignore
      }
    })();
  }, []);

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

        <Form.Item label="Email" name="email" rules={[{ type: 'email', message: 'To\'g\'ri email kiriting!' }, ...(role === 'admin' && !isEdit ? [{ required: true, message: 'Admin uchun email kerak' }] : [])]}>
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

        {role === 'admin' && (
          <Form.Item label="Filial" name="branchId" rules={[{ required: true, message: 'Filialni tanlang!' }]}>
            <Select placeholder="Filialni tanlang" options={branches.map((b) => ({ value: b._id, label: b.name || b._id }))} />
          </Form.Item>
        )}

        {role === 'admin' && (
          <>
            {!isEdit ? (
              <Row gutter={16}>
                <Col span={12}>
                  <Form.Item label="Parol" name="password" rules={[{ required: true, message: 'Parol kiriting!' }, { min: 6, message: 'Kamida 6 ta belgi' }]}>
                    <Input.Password placeholder="••••••" />
                  </Form.Item>
                </Col>
                <Col span={12}>
                  <Form.Item label="Parol (takror)" name="password2" dependencies={['password']} rules={[({ getFieldValue }) => ({
                    validator(_, value) {
                      if (!value || getFieldValue('password') === value) return Promise.resolve();
                      return Promise.reject(new Error('Parollar mos emas'));
                    }
                  })]}>
                    <Input.Password placeholder="••••••" />
                  </Form.Item>
                </Col>
              </Row>
            ) : (
              <Row gutter={16}>
                <Col span={12}>
                  <Form.Item label="Yangi parol (ixtiyoriy)" name="password" rules={[{ min: 6, message: 'Kamida 6 ta belgi' }]}>
                    <Input.Password placeholder="Parolni o'zgartirmoqchi bo'lsangiz kiriting" />
                  </Form.Item>
                </Col>
                <Col span={12}>
                  <Form.Item label="Parol (takror)" name="password2" dependencies={['password']} rules={[({ getFieldValue }) => ({
                    validator(_, value) {
                      const pwd = getFieldValue('password');
                      if (!pwd && !value) return Promise.resolve();
                      if (pwd && value === pwd) return Promise.resolve();
                      return Promise.reject(new Error('Parollar mos emas'));
                    }
                  })]}>
                    <Input.Password placeholder="Tasdiqlash" />
                  </Form.Item>
                </Col>
              </Row>
            )}
          </>
        )}

        {role === 'courier' && (
          <Form.Item label="Telegram ID" name="telegramId">
            <Input placeholder="123456789" />
          </Form.Item>
        )}

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


