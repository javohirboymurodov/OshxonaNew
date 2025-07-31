// src/pages/Login/LoginPage.tsx
import React, { useState } from 'react';
import { Form, Input, Button, Card, Typography, Alert, Space, Divider } from 'antd';
import { UserOutlined, LockOutlined, LoginOutlined } from '@ant-design/icons';
import { useAuth } from '@/hooks/useAuth';
import { useNavigate } from 'react-router-dom';
import './LoginPage.css';

const { Title, Text } = Typography;

interface LoginForm {
  email: string;
  password: string;
}

const LoginPage: React.FC = () => {
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const { login } = useAuth();
  const navigate = useNavigate();

  const onFinish = async (values: LoginForm) => {
    setLoading(true);
    setError(null);

    try {
      await login(values.email, values.password);
      navigate('/dashboard');
    } catch (err: any) {
      setError(err.response?.data?.message || 'Login xatosi yuz berdi!');
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="login-container">
      <div className="login-wrapper">
        <Card className="login-card" variant="outlined">
          {/* Logo va Title */}
          <div className="login-header">
            <div className="logo">
              <div className="logo-icon">🍽️</div>
            </div>
            <Title level={2} className="login-title">
              Oshxona Admin Panel
            </Title>
            <Text className="login-subtitle">
              Admin panelga kirish uchun ma'lumotlaringizni kiriting
            </Text>
          </div>

          {/* Error Alert */}
          {error && (
            <Alert
              message={error}
              type="error"
              showIcon
              closable
              style={{ marginBottom: 24 }}
              onClose={() => setError(null)}
            />
          )}

          {/* Login Form */}
          <Form
            name="login"
            size="large"
            onFinish={onFinish}
            autoComplete="off"
            layout="vertical"
          >
            <Form.Item
              label="Email"
              name="email"
              rules={[
                { required: true, message: 'Email kiritish shart!' },
                { type: 'email', message: 'Email formati noto\'g\'ri!' }
              ]}
            >
              <Input 
                prefix={<UserOutlined />} 
                placeholder="superadmin@oshxona.uz"
                autoComplete="email"
              />
            </Form.Item>

            <Form.Item
              label="Parol"
              name="password"
              rules={[
                { required: true, message: 'Parol kiritish shart!' },
                { min: 6, message: 'Parol kamida 6 ta belgidan iborat bo\'lishi kerak!' }
              ]}
            >
              <Input.Password
                prefix={<LockOutlined />}
                placeholder="Parolingizni kiriting"
                autoComplete="current-password"
              />
            </Form.Item>

            <Form.Item>
              <Button
                type="primary"
                htmlType="submit"
                loading={loading}
                icon={<LoginOutlined />}
                block
                size="large"
                className="login-button"
              >
                {loading ? 'Kirilmoqda...' : 'Kirish'}
              </Button>
            </Form.Item>
          </Form>

          <Divider>Demo Ma'lumotlar</Divider>

          {/* Demo Credentials */}
          <div className="demo-credentials">
            <Space direction="vertical" size="small" style={{ width: '100%' }}>
              <div className="demo-item">
                <Text strong>SuperAdmin:</Text>
                <Text code>superadmin@oshxona.uz</Text>
                <Text code>SuperAdmin2024!</Text>
              </div>
              <div className="demo-item">
                <Text type="secondary" style={{ fontSize: '12px' }}>
                  * Demo uchun yuqoridagi ma'lumotlarni ishlatishingiz mumkin
                </Text>
              </div>
            </Space>
          </div>
        </Card>

        {/* Footer */}
        <div className="login-footer">
          <Text type="secondary">
            © 2024 Oshxona Professional Bot. Barcha huquqlar himoyalangan.
          </Text>
        </div>
      </div>
    </div>
  );
};

export default LoginPage;