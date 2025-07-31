// src/pages/Settings/SettingsPage.tsx
import React, { useState, useEffect } from 'react';
import {
  Card,
  Row,
  Col,
  Typography,
  Form,
  Input,
  Button,
  Switch,
  Select,
  InputNumber,
  Upload,
  message,
  Divider,
  Space,
  TimePicker,
  Tabs,
  Table,
  Modal,
  Tag,
  Alert
} from 'antd';
import {
  SaveOutlined,
  UploadOutlined,
  PlusOutlined,
  EditOutlined,
  DeleteOutlined,
  SettingOutlined,
  ShopOutlined,
  BellOutlined,
  DollarOutlined,
  ClockCircleOutlined,
  GlobalOutlined
} from '@ant-design/icons';
import dayjs from 'dayjs';
import type { ColumnsType } from 'antd/es/table';

const { Title, Text } = Typography;
const { Option } = Select;
const { TextArea } = Input;
const { TabPane } = Tabs;

interface AppSettings {
  appName: string;
  description: string;
  logo?: string;
  contactPhone: string;
  contactEmail: string;
  workingHours: {
    start: string;
    end: string;
  };
  isMaintenanceMode: boolean;
  maintenanceMessage: string;
  currency: string;
  language: string;
  timezone: string;
}

interface Branch {
  _id: string;
  name: string;
  address: string;
  phone: string;
  workingHours: {
    start: string;
    end: string;
  };
  isActive: boolean;
  deliveryRadius: number; // km
  deliveryFee: number;
}

interface NotificationSettings {
  newOrderNotification: boolean;
  orderStatusNotification: boolean;
  lowStockNotification: boolean;
  dailyReportNotification: boolean;
  emailNotifications: boolean;
  telegramNotifications: boolean;
  telegramBotToken: string;
  telegramChatId: string;
}

const SettingsPage: React.FC = () => {
  const [loading, setLoading] = useState(false);
  const [appSettings, setAppSettings] = useState<AppSettings>({
    appName: 'Oshxona Admin',
    description: 'Taom yetkazib berish xizmati',
    contactPhone: '+998901234567',
    contactEmail: 'info@oshxona.uz',
    workingHours: {
      start: '09:00',
      end: '23:00'
    },
    isMaintenanceMode: false,
    maintenanceMessage: 'Texnik ishlar olib borilmoqda',
    currency: 'UZS',
    language: 'uz',
    timezone: 'Asia/Tashkent'
  });

  const [branches, setBranches] = useState<Branch[]>([]);
  const [notifications, setNotifications] = useState<NotificationSettings>({
    newOrderNotification: true,
    orderStatusNotification: true,
    lowStockNotification: true,
    dailyReportNotification: false,
    emailNotifications: false,
    telegramNotifications: true,
    telegramBotToken: '',
    telegramChatId: ''
  });

  const [branchModalVisible, setBranchModalVisible] = useState(false);
  const [editingBranch, setEditingBranch] = useState<Branch | null>(null);

  const [appForm] = Form.useForm();
  const [branchForm] = Form.useForm();
  const [notificationForm] = Form.useForm();

  useEffect(() => {
    fetchSettings();
    fetchBranches();
  }, []);

  const fetchSettings = async () => {
    try {
      const response = await fetch('/api/admin/settings', {
        headers: {
          'Authorization': `Bearer ${localStorage.getItem('token')}`
        }
      });

      if (response.ok) {
        const data = await response.json();
        setAppSettings(data.appSettings);
        setNotifications(data.notifications);
        appForm.setFieldsValue(data.appSettings);
        notificationForm.setFieldsValue(data.notifications);
      } else {
        // Use default values
        appForm.setFieldsValue(appSettings);
        notificationForm.setFieldsValue(notifications);
      }
    } catch (error) {
      console.error('Error fetching settings:', error);
      // Use default values
      appForm.setFieldsValue(appSettings);
      notificationForm.setFieldsValue(notifications);
    }
  };

  const fetchBranches = async () => {
    try {
      const response = await fetch('/api/admin/branches', {
        headers: {
          'Authorization': `Bearer ${localStorage.getItem('token')}`
        }
      });

      if (response.ok) {
        const data = await response.json();
        setBranches(data.branches || []);
      } else {
        // Mock data
        setBranches([
          {
            _id: '1',
            name: 'Toshkent filiali',
            address: 'Toshkent shahar, Amir Temur ko\'chasi',
            phone: '+998712345678',
            workingHours: { start: '09:00', end: '23:00' },
            isActive: true,
            deliveryRadius: 15,
            deliveryFee: 15000
          },
          {
            _id: '2',
            name: 'Samarqand filiali',
            address: 'Samarqand shahar, Registon ko\'chasi',
            phone: '+998662345678',
            workingHours: { start: '10:00', end: '22:00' },
            isActive: true,
            deliveryRadius: 10,
            deliveryFee: 12000
          }
        ]);
      }
    } catch (error) {
      console.error('Error fetching branches:', error);
      // Mock data
      setBranches([
        {
          _id: '1',
          name: 'Toshkent filiali',
          address: 'Toshkent shahar, Amir Temur ko\'chasi',
          phone: '+998712345678',
          workingHours: { start: '09:00', end: '23:00' },
          isActive: true,
          deliveryRadius: 15,
          deliveryFee: 15000
        }
      ]);
    }
  };

  const handleSaveAppSettings = async (values: any) => {
    setLoading(true);
    try {
      const response = await fetch('/api/admin/settings/app', {
        method: 'PUT',
        headers: {
          'Content-Type': 'application/json',
          'Authorization': `Bearer ${localStorage.getItem('token')}`
        },
        body: JSON.stringify(values)
      });

      if (response.ok) {
        message.success('Sozlamalar saqlandi!');
        setAppSettings(values);
      } else {
        message.error('Sozlamalarni saqlashda xatolik!');
      }
    } catch (error) {
      console.error('Error saving app settings:', error);
      message.success('Sozlamalar saqlandi! (Demo mode)');
      setAppSettings(values);
    } finally {
      setLoading(false);
    }
  };

  const handleSaveNotifications = async (values: any) => {
    setLoading(true);
    try {
      const response = await fetch('/api/admin/settings/notifications', {
        method: 'PUT',
        headers: {
          'Content-Type': 'application/json',
          'Authorization': `Bearer ${localStorage.getItem('token')}`
        },
        body: JSON.stringify(values)
      });

      if (response.ok) {
        message.success('Bildirishnoma sozlamalari saqlandi!');
        setNotifications(values);
      } else {
        message.error('Sozlamalarni saqlashda xatolik!');
      }
    } catch (error) {
      console.error('Error saving notification settings:', error);
      message.success('Bildirishnoma sozlamalari saqlandi! (Demo mode)');
      setNotifications(values);
    } finally {
      setLoading(false);
    }
  };

  const handleSaveBranch = async (values: any) => {
    try {
      const url = editingBranch 
        ? `/api/admin/branches/${editingBranch._id}`
        : '/api/admin/branches';
      
      const method = editingBranch ? 'PUT' : 'POST';

      const response = await fetch(url, {
        method,
        headers: {
          'Content-Type': 'application/json',
          'Authorization': `Bearer ${localStorage.getItem('token')}`
        },
        body: JSON.stringify(values)
      });

      if (response.ok) {
        message.success(`Filial ${editingBranch ? 'yangilandi' : 'yaratildi'}!`);
        setBranchModalVisible(false);
        setEditingBranch(null);
        branchForm.resetFields();
        fetchBranches();
      } else {
        message.error('Filialni saqlashda xatolik!');
      }
    } catch (error) {
      console.error('Error saving branch:', error);
      message.success(`Filial ${editingBranch ? 'yangilandi' : 'yaratildi'}! (Demo mode)`);
      setBranchModalVisible(false);
      setEditingBranch(null);
      branchForm.resetFields();
    }
  };

  const deleteBranch = async (branchId: string) => {
    try {
      const response = await fetch(`/api/admin/branches/${branchId}`, {
        method: 'DELETE',
        headers: {
          'Authorization': `Bearer ${localStorage.getItem('token')}`
        }
      });

      if (response.ok) {
        message.success('Filial o\'chirildi!');
        fetchBranches();
      } else {
        message.error('Filialni o\'chirishda xatolik!');
      }
    } catch (error) {
      console.error('Error deleting branch:', error);
      message.success('Filial o\'chirildi! (Demo mode)');
    }
  };

  const branchColumns: ColumnsType<Branch> = [
    {
      title: 'Filial nomi',
      dataIndex: 'name',
      key: 'name',
    },
    {
      title: 'Manzil',
      dataIndex: 'address',
      key: 'address',
    },
    {
      title: 'Telefon',
      dataIndex: 'phone',
      key: 'phone',
    },
    {
      title: 'Ish vaqti',
      key: 'workingHours',
      render: (record: Branch) => (
        `${record.workingHours.start} - ${record.workingHours.end}`
      ),
    },
    {
      title: 'Yetkazib berish',
      key: 'delivery',
      render: (record: Branch) => (
        <div>
          <div>{record.deliveryRadius} km</div>
          <Text type="secondary">{record.deliveryFee.toLocaleString()} so'm</Text>
        </div>
      ),
    },
    {
      title: 'Holat',
      dataIndex: 'isActive',
      key: 'isActive',
      render: (isActive: boolean) => (
        <Tag color={isActive ? 'green' : 'red'}>
          {isActive ? 'Faol' : 'Nofaol'}
        </Tag>
      ),
    },
    {
      title: 'Amallar',
      key: 'actions',
      render: (_: any, record: Branch) => (
        <Space>
          <Button
            type="link"
            size="small"
            icon={<EditOutlined />}
            onClick={() => {
              setEditingBranch(record);
              branchForm.setFieldsValue({
                ...record,
                workingStart: dayjs(record.workingHours.start, 'HH:mm'),
                workingEnd: dayjs(record.workingHours.end, 'HH:mm'),
              });
              setBranchModalVisible(true);
            }}
          />
          <Button
            type="link"
            size="small"
            danger
            icon={<DeleteOutlined />}
            onClick={() => {
              Modal.confirm({
                title: 'Filialni o\'chirish',
                content: 'Bu filialni o\'chirishni tasdiqlaysizmi?',
                onOk: () => deleteBranch(record._id),
              });
            }}
          />
        </Space>
      ),
    },
  ];

  return (
    <div>
      <Title level={2}>Sozlamalar</Title>

      <Tabs defaultActiveKey="app">
        <TabPane tab={<span><SettingOutlined />Umumiy sozlamalar</span>} key="app">
          <Card>
            <Form
              form={appForm}
              layout="vertical"
              onFinish={handleSaveAppSettings}
              initialValues={appSettings}
            >
              <Row gutter={24}>
                <Col xs={24} lg={12}>
                  <Form.Item
                    label="Ilova nomi"
                    name="appName"
                    rules={[{ required: true, message: 'Ilova nomini kiriting!' }]}
                  >
                    <Input placeholder="Oshxona Admin" />
                  </Form.Item>

                  <Form.Item
                    label="Tavsif"
                    name="description"
                  >
                    <TextArea rows={3} placeholder="Taom yetkazib berish xizmati" />
                  </Form.Item>

                  <Form.Item
                    label="Aloqa telefoni"
                    name="contactPhone"
                    rules={[{ required: true, message: 'Telefon raqamini kiriting!' }]}
                  >
                    <Input placeholder="+998901234567" />
                  </Form.Item>

                  <Form.Item
                    label="Email"
                    name="contactEmail"
                    rules={[{ type: 'email', message: 'To\'g\'ri email kiriting!' }]}
                  >
                    <Input placeholder="info@oshxona.uz" />
                  </Form.Item>
                </Col>

                <Col xs={24} lg={12}>
                  <Form.Item
                    label="Ish vaqti boshlanishi"
                    name={['workingHours', 'start']}
                  >
                    <Input placeholder="09:00" />
                  </Form.Item>

                  <Form.Item
                    label="Ish vaqti tugashi"
                    name={['workingHours', 'end']}
                  >
                    <Input placeholder="23:00" />
                  </Form.Item>

                  <Form.Item
                    label="Valyuta"
                    name="currency"
                  >
                    <Select>
                      <Option value="UZS">O'zbek so'm (UZS)</Option>
                      <Option value="USD">Dollar (USD)</Option>
                      <Option value="EUR">Evro (EUR)</Option>
                    </Select>
                  </Form.Item>

                  <Form.Item
                    label="Til"
                    name="language"
                  >
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
                  <Form.Item
                    label="Texnik ta'mirlash rejimi"
                    name="isMaintenanceMode"
                    valuePropName="checked"
                  >
                    <Switch />
                  </Form.Item>

                  <Form.Item
                    label="Ta'mirlash xabari"
                    name="maintenanceMessage"
                  >
                    <TextArea rows={2} placeholder="Texnik ishlar olib borilmoqda" />
                  </Form.Item>
                </Col>
              </Row>

              <Form.Item>
                <Button 
                  type="primary" 
                  htmlType="submit" 
                  icon={<SaveOutlined />}
                  loading={loading}
                >
                  Saqlash
                </Button>
              </Form.Item>
            </Form>
          </Card>
        </TabPane>

        <TabPane tab={<span><ShopOutlined />Filiallar</span>} key="branches">
          <Card
            title="Filiallar"
            extra={
              <Button
                type="primary"
                icon={<PlusOutlined />}
                onClick={() => {
                  setEditingBranch(null);
                  branchForm.resetFields();
                  setBranchModalVisible(true);
                }}
              >
                Yangi filial
              </Button>
            }
          >
            <Table
              columns={branchColumns}
              dataSource={branches}
              rowKey="_id"
              pagination={false}
            />
          </Card>
        </TabPane>

        <TabPane tab={<span><BellOutlined />Bildirishnomalar</span>} key="notifications">
          <Card>
            <Form
              form={notificationForm}
              layout="vertical"
              onFinish={handleSaveNotifications}
              initialValues={notifications}
            >
              <Alert
                message="Bildirishnoma sozlamalari"
                description="Turli hodisalar uchun bildirishnomalarni yoqish yoki o'chirish mumkin."
                type="info"
                style={{ marginBottom: 24 }}
              />

              <Row gutter={24}>
                <Col xs={24} lg={12}>
                  <Title level={4}>Hodisalar</Title>
                  
                  <Form.Item
                    label="Yangi buyurtma"
                    name="newOrderNotification"
                    valuePropName="checked"
                  >
                    <Switch />
                  </Form.Item>

                  <Form.Item
                    label="Buyurtma holati o'zgarganda"
                    name="orderStatusNotification"
                    valuePropName="checked"
                  >
                    <Switch />
                  </Form.Item>

                  <Form.Item
                    label="Mahsulot tugab qolganda"
                    name="lowStockNotification"
                    valuePropName="checked"
                  >
                    <Switch />
                  </Form.Item>

                  <Form.Item
                    label="Kunlik hisobot"
                    name="dailyReportNotification"
                    valuePropName="checked"
                  >
                    <Switch />
                  </Form.Item>
                </Col>

                <Col xs={24} lg={12}>
                  <Title level={4}>Yuborish usullari</Title>
                  
                  <Form.Item
                    label="Email orqali"
                    name="emailNotifications"
                    valuePropName="checked"
                  >
                    <Switch />
                  </Form.Item>

                  <Form.Item
                    label="Telegram orqali"
                    name="telegramNotifications"
                    valuePropName="checked"
                  >
                    <Switch />
                  </Form.Item>

                  <Form.Item
                    label="Telegram Bot Token"
                    name="telegramBotToken"
                  >
                    <Input.Password placeholder="Bot token" />
                  </Form.Item>

                  <Form.Item
                    label="Telegram Chat ID"
                    name="telegramChatId"
                  >
                    <Input placeholder="Chat ID" />
                  </Form.Item>
                </Col>
              </Row>

              <Form.Item>
                <Button 
                  type="primary" 
                  htmlType="submit" 
                  icon={<SaveOutlined />}
                  loading={loading}
                >
                  Saqlash
                </Button>
              </Form.Item>
            </Form>
          </Card>
        </TabPane>
      </Tabs>

      {/* Branch Modal */}
      <Modal
        title={editingBranch ? 'Filialni tahrirlash' : 'Yangi filial qo\'shish'}
        open={branchModalVisible}
        onCancel={() => {
          setBranchModalVisible(false);
          setEditingBranch(null);
          branchForm.resetFields();
        }}
        footer={null}
        width={600}
      >
        <Form
          form={branchForm}
          layout="vertical"
          onFinish={handleSaveBranch}
        >
          <Row gutter={16}>
            <Col span={12}>
              <Form.Item
                label="Filial nomi"
                name="name"
                rules={[{ required: true, message: 'Filial nomini kiriting!' }]}
              >
                <Input placeholder="Toshkent filiali" />
              </Form.Item>
            </Col>
            <Col span={12}>
              <Form.Item
                label="Telefon"
                name="phone"
                rules={[{ required: true, message: 'Telefon raqamini kiriting!' }]}
              >
                <Input placeholder="+998712345678" />
              </Form.Item>
            </Col>
          </Row>

          <Form.Item
            label="Manzil"
            name="address"
            rules={[{ required: true, message: 'Manzilni kiriting!' }]}
          >
            <TextArea rows={2} placeholder="To'liq manzil" />
          </Form.Item>

          <Row gutter={16}>
            <Col span={12}>
              <Form.Item
                label="Ish boshlanishi"
                name={['workingHours', 'start']}
                rules={[{ required: true, message: 'Ish vaqtini kiriting!' }]}
              >
                <Input placeholder="09:00" />
              </Form.Item>
            </Col>
            <Col span={12}>
              <Form.Item
                label="Ish tugashi"
                name={['workingHours', 'end']}
                rules={[{ required: true, message: 'Ish vaqtini kiriting!' }]}
              >
                <Input placeholder="23:00" />
              </Form.Item>
            </Col>
          </Row>

          <Row gutter={16}>
            <Col span={12}>
              <Form.Item
                label="Yetkazib berish radiusi (km)"
                name="deliveryRadius"
                rules={[{ required: true, message: 'Radiusni kiriting!' }]}
              >
                <InputNumber 
                  placeholder="15" 
                  style={{ width: '100%' }}
                  min={1}
                  max={50}
                />
              </Form.Item>
            </Col>
            <Col span={12}>
              <Form.Item
                label="Yetkazib berish narxi"
                name="deliveryFee"
                rules={[{ required: true, message: 'Narxni kiriting!' }]}
              >
                <InputNumber 
                  placeholder="15000" 
                  style={{ width: '100%' }}
                  min={0}
                  formatter={(value) => `${value}`.replace(/\B(?=(\d{3})+(?!\d))/g, ',')}
                />
              </Form.Item>
            </Col>
          </Row>

          <Form.Item
            label="Faol holat"
            name="isActive"
            valuePropName="checked"
          >
            <Switch />
          </Form.Item>

          <Row justify="end" gutter={16}>
            <Col>
              <Button onClick={() => {
                setBranchModalVisible(false);
                setEditingBranch(null);
                branchForm.resetFields();
              }}>
                Bekor qilish
              </Button>
            </Col>
            <Col>
              <Button type="primary" htmlType="submit">
                {editingBranch ? 'Yangilash' : 'Yaratish'}
              </Button>
            </Col>
          </Row>
        </Form>
      </Modal>
    </div>
  );
};

export default SettingsPage;