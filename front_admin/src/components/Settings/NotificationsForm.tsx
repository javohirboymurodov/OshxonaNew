import React, { useEffect } from 'react';
import { Card, Form, Row, Col, Switch, Input, Button, Alert, Typography } from 'antd';
import { SaveOutlined } from '@ant-design/icons';
import { NotificationSettings } from './types';

const { Title } = Typography;

interface Props {
  initialValues: NotificationSettings;
  loading: boolean;
  onSubmit: (values: NotificationSettings) => void;
}

const NotificationsForm: React.FC<Props> = ({ initialValues, loading, onSubmit }) => {
  const [form] = Form.useForm();
  useEffect(() => {
    form.setFieldsValue(initialValues);
  }, [initialValues, form]);
  return (
    <Card>
      <Form form={form} layout="vertical" onFinish={onSubmit} initialValues={initialValues}>
        <Alert message="Bildirishnoma sozlamalari" description="Turli hodisalar uchun bildirishnomalarni yoqish yoki o'chirish mumkin." type="info" style={{ marginBottom: 24 }} />

        <Row gutter={24}>
          <Col xs={24} lg={12}>
            <Title level={4}>Hodisalar</Title>
            <Form.Item label="Yangi buyurtma" name="newOrderNotification" valuePropName="checked"><Switch /></Form.Item>
            <Form.Item label="Buyurtma holati o'zgarganda" name="orderStatusNotification" valuePropName="checked"><Switch /></Form.Item>
            <Form.Item label="Mahsulot tugab qolganda" name="lowStockNotification" valuePropName="checked"><Switch /></Form.Item>
            <Form.Item label="Kunlik hisobot" name="dailyReportNotification" valuePropName="checked"><Switch /></Form.Item>
          </Col>
          <Col xs={24} lg={12}>
            <Title level={4}>Yuborish usullari</Title>
            <Form.Item label="Email orqali" name="emailNotifications" valuePropName="checked"><Switch /></Form.Item>
            <Form.Item label="Telegram orqali" name="telegramNotifications" valuePropName="checked"><Switch /></Form.Item>
            <Form.Item label="Telegram Bot Token" name="telegramBotToken"><Input.Password placeholder="Bot token" /></Form.Item>
            <Form.Item label="Telegram Chat ID" name="telegramChatId"><Input placeholder="Chat ID" /></Form.Item>
          </Col>
        </Row>

        <Form.Item>
          <Button type="primary" htmlType="submit" icon={<SaveOutlined />} loading={loading}>Saqlash</Button>
        </Form.Item>
      </Form>
    </Card>
  );
};

export default NotificationsForm;


