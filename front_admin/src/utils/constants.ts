// Common Constants - Magic numbers va string'larni centralize qilish
export const PAGE_SIZES = [10, 20, 50, 100] as const;
export const DEFAULT_PAGE_SIZE = 20;

export const API_ENDPOINTS = {
  AUTH: {
    LOGIN: '/auth/login',
    ME: '/auth/me',
    LOGOUT: '/auth/logout'
  },
  USERS: '/users',
  PRODUCTS: '/products',
  CATEGORIES: '/categories', 
  ORDERS: '/orders',
  BRANCHES: '/branches',
  COURIERS: '/couriers',
  DASHBOARD: '/dashboard',
  TABLES: '/tables'
} as const;

export const ROLES = {
  USER: 'user',
  ADMIN: 'admin',
  SUPERADMIN: 'superadmin',
  COURIER: 'courier'
} as const;

export const ORDER_STATUSES = {
  NEW: 'new',
  CONFIRMED: 'confirmed', 
  PREPARING: 'preparing',
  READY: 'ready',
  DELIVERING: 'delivering',
  COMPLETED: 'completed',
  CANCELLED: 'cancelled'
} as const;

export const ORDER_TYPES = {
  DELIVERY: 'delivery',
  PICKUP: 'pickup',
  DINE_IN: 'dine_in',
  TABLE: 'table'
} as const;

export const STATUS_COLORS = {
  [ORDER_STATUSES.NEW]: '#1890ff',
  [ORDER_STATUSES.CONFIRMED]: '#13c2c2',
  [ORDER_STATUSES.PREPARING]: '#faad14',
  [ORDER_STATUSES.READY]: '#52c41a', 
  [ORDER_STATUSES.DELIVERING]: '#722ed1',
  [ORDER_STATUSES.COMPLETED]: '#52c41a',
  [ORDER_STATUSES.CANCELLED]: '#ff4d4f'
} as const;

export const STATUS_LABELS = {
  [ORDER_STATUSES.NEW]: 'Yangi',
  [ORDER_STATUSES.CONFIRMED]: 'Tasdiqlangan',
  [ORDER_STATUSES.PREPARING]: 'Tayyorlanmoqda',
  [ORDER_STATUSES.READY]: 'Tayyor',
  [ORDER_STATUSES.DELIVERING]: 'Yetkazilmoqda',
  [ORDER_STATUSES.COMPLETED]: 'Bajarildi',
  [ORDER_STATUSES.CANCELLED]: 'Bekor qilindi'
} as const;

export const PAYMENT_METHODS = {
  CASH: 'cash',
  CARD: 'card', 
  CLICK: 'click',
  PAYME: 'payme'
} as const;

export const PAYMENT_LABELS = {
  [PAYMENT_METHODS.CASH]: 'Naqd pul',
  [PAYMENT_METHODS.CARD]: 'Plastik karta',
  [PAYMENT_METHODS.CLICK]: 'Click',
  [PAYMENT_METHODS.PAYME]: 'Payme'
} as const;

export const DATE_FORMATS = {
  DATE: 'DD.MM.YYYY',
  DATETIME: 'DD.MM.YYYY HH:mm',
  TIME: 'HH:mm'
} as const;

export const MESSAGES = {
  SUCCESS: {
    CREATED: 'Muvaffaqiyatli yaratildi',
    UPDATED: 'Muvaffaqiyatli yangilandi', 
    DELETED: 'Muvaffaqiyatli o\'chirildi',
    SAVED: 'Muvaffaqiyatli saqlandi'
  },
  ERROR: {
    GENERIC: 'Xatolik yuz berdi',
    NETWORK: 'Tarmoq xatosi',
    UNAUTHORIZED: 'Ruxsat berilmagan',
    VALIDATION: 'Ma\'lumotlar noto\'g\'ri',
    NOT_FOUND: 'Topilmadi'
  },
  CONFIRM: {
    DELETE: 'Rostdan ham o\'chirmoqchimisiz?',
    CANCEL: 'Rostdan ham bekor qilmoqchimisiz?'
  }
} as const;
