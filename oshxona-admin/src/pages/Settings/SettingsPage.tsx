// src/pages/Settings/SettingsPage.tsx
import React, { useState, useEffect } from 'react';
import { Typography, Form, message, Tabs } from 'antd';
import { SettingOutlined, ShopOutlined, BellOutlined, QrcodeOutlined } from '@ant-design/icons';
import AppSettingsForm from '@/components/Settings/AppSettingsForm';
import BranchesTable from '@/components/Settings/BranchesTable';
import BranchModal from '@/components/Settings/BranchModal';
import TablesManager from '@/components/Settings/TablesManager';
import NotificationsForm from '@/components/Settings/NotificationsForm';
import apiService from '@/services/api';

const { Title } = Typography;
// Using Tabs.items API; no TabPane

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
  const [messageApi, contextHolder] = message.useMessage();
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

  // Forms used by child components / modals
  // App and Notifications forms are handled inside their own components
  const [branchForm] = Form.useForm();

  useEffect(() => {
    fetchSettings();
    fetchBranches();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  const fetchSettings = async () => {
    try {
      const data: { appSettings?: Partial<AppSettings>; notifications?: Partial<NotificationSettings> } = await apiService.getSettings();
      const app: Partial<AppSettings> = data?.appSettings ?? {};
      const noti: Partial<NotificationSettings> = data?.notifications ?? {};
      setAppSettings({ ...appSettings, ...app });
      setNotifications({ ...notifications, ...noti });
    } catch (error) {
      console.error('Error fetching settings:', error);
      // Use default values (child forms manage their own state)
    }
  };

  const fetchBranches = async () => {
    try {
      const data: { branches?: Branch[]; items?: Branch[] } | Branch[] = await apiService.getBranches();
      const list = Array.isArray(data) ? data : (data.branches ?? data.items ?? []);
      setBranches(list);
    } catch (error) {
      console.error('Error fetching branches:', error);
      setBranches([]);
    }
  };

  const handleSaveAppSettings = async (values: AppSettings) => {
    setLoading(true);
    try {
      await apiService.updateSettings({ appSettings: values, notifications });
      messageApi.success('Sozlamalar saqlandi!');
        setAppSettings(values);
    } catch (error) {
      console.error('Error saving app settings:', error);
      messageApi.error('Sozlamalarni saqlashda xatolik!');
    } finally {
      setLoading(false);
    }
  };

  const handleSaveNotifications = async (values: NotificationSettings) => {
    setLoading(true);
    try {
      await apiService.updateSettings({ appSettings, notifications: values });
      messageApi.success('Bildirishnoma sozlamalari saqlandi!');
        setNotifications(values);
    } catch (error) {
      console.error('Error saving notification settings:', error);
      messageApi.error('Sozlamalarni saqlashda xatolik!');
    } finally {
      setLoading(false);
    }
  };

  const handleSaveBranch = async (values: Record<string, unknown>) => {
    try {
      // Normalize payload to backend schema
      const { deliveryRadius, deliveryFee, workingHours, ...rest } = values as any;
      const payload: any = { ...rest };
      // Map delivery fields into settings
      if (deliveryRadius != null || deliveryFee != null) {
        payload.settings = {
          ...(rest.settings || {}),
          ...(deliveryRadius != null ? { maxDeliveryDistance: Number(deliveryRadius) } : {}),
          ...(deliveryFee != null ? { deliveryFee: Number(deliveryFee) } : {}),
        };
      }
      // Map flat working hours to monday (fallback) if provided
      if (workingHours && (workingHours.start || workingHours.end)) {
        payload.workingHours = {
          monday: {
            open: workingHours.start || '',
            close: workingHours.end || '',
            isOpen: true,
          },
        };
      }

      if (editingBranch) {
        await apiService.updateBranch(editingBranch._id, payload);
      } else {
        await apiService.createBranch(payload);
      }
      messageApi.success(`Filial ${editingBranch ? 'yangilandi' : 'yaratildi'}!`);
        setBranchModalVisible(false);
        setEditingBranch(null);
        branchForm.resetFields();
        fetchBranches();
    } catch (error) {
      console.error('Error saving branch:', error);
      messageApi.error('Filialni saqlashda xatolik!');
    }
  };

  const deleteBranch = async (branchId: string) => {
    try {
      await apiService.deleteBranch(branchId);
        message.success('Filial o\'chirildi!');
        fetchBranches();
    } catch (error) {
      console.error('Error deleting branch:', error);
      message.error('Filialni o\'chirishda xatolik!');
    }
  };

  // Columns moved into BranchesTable with schema-safe renderers

  return (
    <div>
      <Title level={2}>Sozlamalar</Title>

      <Tabs
        defaultActiveKey="app"
        items={[
          {
            key: 'app',
            label: (
              <span>
                <SettingOutlined />Umumiy sozlamalar
              </span>
            ),
            children: (
              <AppSettingsForm initialValues={appSettings} loading={loading} onSubmit={handleSaveAppSettings} />
            ),
          },
          {
            key: 'branches',
            label: (
              <span>
                <ShopOutlined />Filiallar
              </span>
            ),
            children: (
              <BranchesTable
                branches={branches}
                onClickNew={() => {
                  setEditingBranch(null);
                  branchForm.resetFields();
                  setBranchModalVisible(true);
                }}
                onEdit={(record) => {
                  setEditingBranch(record);
                  const wh = (
                    record as unknown as { workingHours?: { start?: string; end?: string; monday?: { open?: string; close?: string } } }
                  ).workingHours || {};
                  const start = typeof wh.start === 'string' ? wh.start : wh.monday?.open;
                  const end = typeof wh.end === 'string' ? wh.end : wh.monday?.close;
                  const settings = (record as unknown as { settings?: { deliveryFee?: number; maxDeliveryDistance?: number } }).settings || {};
                  const deliveryRadius = (record as unknown as { deliveryRadius?: number }).deliveryRadius ?? settings.maxDeliveryDistance;
                  const deliveryFee = (record as unknown as { deliveryFee?: number }).deliveryFee ?? settings.deliveryFee;
                  branchForm.setFieldsValue({
                    ...record,
                    workingHours: { start, end },
                    deliveryRadius,
                    deliveryFee,
                  });
                  setBranchModalVisible(true);
                }}
                onDelete={(id) => deleteBranch(id)}
              />
            ),
          },
          {
            key: 'tables',
            label: (
              <span>
                <QrcodeOutlined />Stollar (QR)
              </span>
            ),
            children: <TablesManager />,
          },
          {
            key: 'notifications',
            label: (
              <span>
                <BellOutlined />Bildirishnomalar
              </span>
            ),
            children: (
              <NotificationsForm initialValues={notifications} loading={loading} onSubmit={handleSaveNotifications} />
            ),
          },
        ]}
      />
      {contextHolder}

      <BranchModal
        open={branchModalVisible}
        initialValues={editingBranch}
        onCancel={() => { setBranchModalVisible(false); setEditingBranch(null); branchForm.resetFields(); }}
        onSubmit={handleSaveBranch}
          form={branchForm}
      />
    </div>
  );
};

export default SettingsPage;