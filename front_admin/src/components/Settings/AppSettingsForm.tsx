import React from 'react';
import { Card, Row, Col, Form, Input, Select, Switch, Divider, Button } from 'antd';
import { SaveOutlined } from '@ant-design/icons';
import { AppSettings } from './types';

const { TextArea } = Input;
const { Option } = Select;

interface Props {
  initialValues: AppSettings;
  loading: boolean;
  onSubmit: (values: AppSettings) => void;
}

const AppSettingsForm: React.FC<Props> = ({ initialValues, loading, onSubmit }) => {
  const [form] = Form.useForm();
  React.useEffect(() => {
    form.setFieldsValue(initialValues);
  }, [initialValues, form]);
  return (
    <Card>
      <Form form={form} layout="vertical" onFinish={onSubmit} initialValues={initialValues}>
        <Row gutter={24}>
          <Col xs={24} lg={12}>
            <Form.Item label="Ilova nomi" name="appName" rules={[{ required: true, message: 'Ilova nomini kiriting!' }]}>
              <Input placeholder="Oshxona Admin" />
            </Form.Item>

            <Form.Item label="Tavsif" name="description">
              <TextArea rows={3} placeholder="Taom yetkazib berish xizmati" />
            </Form.Item>

            <Form.Item label="Aloqa telefoni" name="contactPhone" rules={[{ required: true, message: 'Telefon raqamini kiriting!' }]}>
              <Input placeholder="+998901234567" />
            </Form.Item>

            <Form.Item label="Email" name="contactEmail" rules={[{ type: 'email', message: "To'g'ri email kiriting!" }]}>
              <Input placeholder="info@oshxona.uz" />
            </Form.Item>
          </Col>

          <Col xs={24} lg={12}>
            <Form.Item label="Ish vaqti boshlanishi" name={['workingHours', 'start']}>
              <Input placeholder="09:00" />
            </Form.Item>

            <Form.Item label="Ish vaqti tugashi" name={['workingHours', 'end']}>
              <Input placeholder="23:00" />
            </Form.Item>

            <Form.Item label="Valyuta" name="currency">
              <Select>
                <Option value="UZS">O'zbek so'm (UZS)</Option>
                <Option value="USD">Dollar (USD)</Option>
                <Option value="EUR">Evro (EUR)</Option>
              </Select>
            </Form.Item>

            <Form.Item label="Til" name="language">
              <Select>
                <Option value="uz">O'zbek tili</Option>
                <Option value="ru">Rus tili</Option>
                <Option value="en">Ingliz tili</Option>
              </Select>
            </Form.Item>
          </Col>
        </Row>

        <Divider />

        <Row gutter={24}>
          <Col xs={24} lg={12}>
            <Form.Item label="Texnik ta'mirlash rejimi" name="isMaintenanceMode" valuePropName="checked">
              <Switch />
            </Form.Item>
            <Form.Item label="Ta'mirlash xabari" name="maintenanceMessage">
              <TextArea rows={2} placeholder="Texnik ishlar olib borilmoqda" />
            </Form.Item>
          </Col>
        </Row>

        <Form.Item>
          <Button type="primary" htmlType="submit" icon={<SaveOutlined />} loading={loading}>
            Saqlash
          </Button>
        </Form.Item>
      </Form>
    </Card>
  );
};

export default AppSettingsForm;


