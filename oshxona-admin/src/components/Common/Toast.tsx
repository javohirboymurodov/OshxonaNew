// src/components/Common/Toast.tsx
import { message, notification } from 'antd';
import { 
  CheckCircleOutlined, 
  ExclamationCircleOutlined, 
  InfoCircleOutlined, 
  CloseCircleOutlined 
} from '@ant-design/icons';

interface ToastOptions {
  duration?: number;
  placement?: 'top' | 'topLeft' | 'topRight' | 'bottom' | 'bottomLeft' | 'bottomRight';
}

class Toast {
  // Simple messages
  static success(content: string, options?: ToastOptions) {
    message.success({
      content,
      duration: options?.duration || 3,
      icon: <CheckCircleOutlined style={{ color: '#52c41a' }} />
    });
  }

  static error(content: string, options?: ToastOptions) {
    message.error({
      content,
      duration: options?.duration || 4,
      icon: <CloseCircleOutlined style={{ color: '#ff4d4f' }} />
    });
  }

  static warning(content: string, options?: ToastOptions) {
    message.warning({
      content,
      duration: options?.duration || 3,
      icon: <ExclamationCircleOutlined style={{ color: '#faad14' }} />
    });
  }

  static info(content: string, options?: ToastOptions) {
    message.info({
      content,
      duration: options?.duration || 3,
      icon: <InfoCircleOutlined style={{ color: '#1890ff' }} />
    });
  }

  static loading(content: string = 'Yuklanmoqda...') {
    return message.loading({
      content,
      duration: 0 // Manual dismiss
    });
  }

  // Rich notifications
  static notify = {
    success: (title: string, description?: string, options?: ToastOptions) => {
      notification.success({
        message: title,
        description,
        duration: options?.duration || 4.5,
        placement: options?.placement || 'topRight',
        icon: <CheckCircleOutlined style={{ color: '#52c41a' }} />
      });
    },

    error: (title: string, description?: string, options?: ToastOptions) => {
      notification.error({
        message: title,
        description,
        duration: options?.duration || 6,
        placement: options?.placement || 'topRight',
        icon: <CloseCircleOutlined style={{ color: '#ff4d4f' }} />
      });
    },

    warning: (title: string, description?: string, options?: ToastOptions) => {
      notification.warning({
        message: title,
        description,
        duration: options?.duration || 4.5,
        placement: options?.placement || 'topRight',
        icon: <ExclamationCircleOutlined style={{ color: '#faad14' }} />
      });
    },

    info: (title: string, description?: string, options?: ToastOptions) => {
      notification.info({
        message: title,
        description,
        duration: options?.duration || 4.5,
        placement: options?.placement || 'topRight',
        icon: <InfoCircleOutlined style={{ color: '#1890ff' }} />
      });
    }
  };

  // Predefined business messages
  static business = {
    orderCreated: () => Toast.success('Buyurtma muvaffaqiyatli yaratildi'),
    orderUpdated: () => Toast.success('Buyurtma holati yangilandi'),
    orderCancelled: () => Toast.warning('Buyurtma bekor qilindi'),
    
    productCreated: () => Toast.success('Mahsulot qo\'shildi'),
    productUpdated: () => Toast.success('Mahsulot ma\'lumotlari yangilandi'),
    productDeleted: () => Toast.success('Mahsulot o\'chirildi'),
    
    promoActivated: () => Toast.success('Aksiya faollashtirildi'),
    promoDeactivated: () => Toast.warning('Aksiya to\'xtatildi'),
    
    courierAssigned: () => Toast.success('Kuryer tayinlandi'),
    courierLocationUpdated: () => Toast.info('Kuryer lokatsiyasi yangilandi'),
    
    loginSuccess: () => Toast.success('Muvaffaqiyatli kirildi'),
    loginFailed: () => Toast.error('Login yoki parol noto\'g\'ri'),
    logoutSuccess: () => Toast.info('Tizimdan chiqildi'),
    
    // Error messages
    networkError: () => Toast.error('Tarmoq xatosi. Internetni tekshiring'),
    serverError: () => Toast.error('Server xatosi. Keyinroq qayta urinib ko\'ring'),
    validationError: (field: string) => Toast.error(`${field} to\'ldirilishi majburiy`),
    permissionDenied: () => Toast.error('Sizda bu amalni bajarish uchun ruxsat yo\'q'),
    
    // Loading states
    savingData: () => Toast.loading('Ma\'lumotlar saqlanmoqda...'),
    loadingData: () => Toast.loading('Ma\'lumotlar yuklanmoqda...'),
    uploadingFile: () => Toast.loading('Fayl yuklanmoqda...')
  };

  // Utility methods
  static destroy() {
    message.destroy();
    notification.destroy();
  }

  static config(options: {
    top?: number;
    duration?: number;
    maxCount?: number;
    rtl?: boolean;
  }) {
    message.config(options);
    notification.config(options);
  }
}

export default Toast;