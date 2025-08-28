// Common Helper Functions - Takrorlanuvchi functions
import { message } from 'antd';
import { MESSAGES } from './constants';

// Format price/currency
export const formatPrice = (price: number): string => {
  return new Intl.NumberFormat('uz-UZ').format(price) + ' so\'m';
};

// Format date
export const formatDate = (date: string | Date, format: string = 'DD.MM.YYYY'): string => {
  if (!date) return '-';
  const d = new Date(date);
  if (isNaN(d.getTime())) return '-';
  
  const day = d.getDate().toString().padStart(2, '0');
  const month = (d.getMonth() + 1).toString().padStart(2, '0');
  const year = d.getFullYear();
  const hours = d.getHours().toString().padStart(2, '0');
  const minutes = d.getMinutes().toString().padStart(2, '0');

  switch (format) {
    case 'DD.MM.YYYY':
      return `${day}.${month}.${year}`;
    case 'DD.MM.YYYY HH:mm':
      return `${day}.${month}.${year} ${hours}:${minutes}`;
    case 'HH:mm':
      return `${hours}:${minutes}`;
    default:
      return `${day}.${month}.${year}`;
  }
};

// Generate image URL
export const getImageUrl = (imagePath?: string): string | undefined => {
  if (!imagePath) return undefined;
  if (imagePath.startsWith('http')) return imagePath;
  return `${import.meta.env.VITE_API_BASE_URL || 'http://localhost:5000'}${imagePath}`;
};

// Handle API errors
export const handleApiError = (error: any, customMessage?: string): void => {
  console.error('API Error:', error);
  
  const errorMessage = customMessage || 
    error?.response?.data?.message || 
    error?.message || 
    MESSAGES.ERROR.GENERIC;
    
  message.error(errorMessage);
};

// Success message helper
export const showSuccess = (text: string = MESSAGES.SUCCESS.SAVED): void => {
  message.success(text);
};

// Confirm delete helper
export const confirmDelete = (onConfirm: () => void, text?: string): void => {
  const confirmText = text || MESSAGES.CONFIRM.DELETE;
  
  if (window.confirm(confirmText)) {
    onConfirm();
  }
};

// Debounce function
// eslint-disable-next-line @typescript-eslint/no-explicit-any
export const debounce = <T extends (...args: any[]) => any>(
  func: T,
  delay: number
): ((...args: Parameters<T>) => void) => {
  let timeoutId: ReturnType<typeof setTimeout>;
  
  return (...args: Parameters<T>) => {
    clearTimeout(timeoutId);
    timeoutId = setTimeout(() => func(...args), delay);
  };
};

// Check permissions helper
export const hasPermission = (userRole: string, requiredRole: string): boolean => {
  const roleHierarchy = ['user', 'courier', 'admin', 'superadmin'];
  const userLevel = roleHierarchy.indexOf(userRole);
  const requiredLevel = roleHierarchy.indexOf(requiredRole);
  
  return userLevel >= requiredLevel;
};

// Generate random ID
export const generateId = (): string => {
  return Math.random().toString(36).substr(2, 9);
};

// Validate email
export const isValidEmail = (email: string): boolean => {
  const emailRegex = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
  return emailRegex.test(email);
};

// Validate phone (Uzbekistan format)
export const isValidPhone = (phone: string): boolean => {
  const phoneRegex = /^(\+998|998|0)?[0-9]{9}$/;
  return phoneRegex.test(phone.replace(/[\s-()]/g, ''));
};

// Format phone number
export const formatPhone = (phone: string): string => {
  if (!phone) return '';
  const cleaned = phone.replace(/\D/g, '');
  
  if (cleaned.startsWith('998')) {
    return '+' + cleaned;
  } else if (cleaned.length === 9) {
    return '+998' + cleaned;
  }
  
  return phone;
};

// Truncate text
export const truncateText = (text: string, length: number = 50): string => {
  if (!text) return '';
  if (text.length <= length) return text;
  return text.substring(0, length) + '...';
};

// Get status color
export const getStatusColor = (status: string): string => {
  const colors: Record<string, string> = {
    'active': '#52c41a',
    'inactive': '#ff4d4f',
    'pending': '#faad14',
    'completed': '#52c41a',
    'cancelled': '#ff4d4f',
    'new': '#1890ff'
  };
  
  return colors[status] || '#666';
};

// Local storage helpers
export const storage = {
  get: <T>(key: string): T | null => {
    try {
      const item = localStorage.getItem(key);
      return item ? JSON.parse(item) : null;
    } catch {
      return null;
    }
  },
  
  set: <T>(key: string, value: T): void => {
    try {
      localStorage.setItem(key, JSON.stringify(value));
    } catch (error) {
      console.error('Storage error:', error);
    }
  },
  
  remove: (key: string): void => {
    localStorage.removeItem(key);
  }
};
