// src/types/index.ts
export interface User {
  _id: string;
  firstName: string;
  lastName: string;
  email: string;
  role: 'superadmin' | 'admin' | 'courier' | 'user';
  telegramId?: number;
  isActive: boolean;
  isBlocked: boolean;
  createdAt: Date;
  updatedAt: Date;
}

export interface Branch {
  _id: string;
  name: string;
  code: string;
  address: {
    street: string;
    city: string;
    district: string;
    coordinates: {
      latitude: number;
      longitude: number;
    };
  };
  phone: string;
  email?: string;
  isActive: boolean;
  workingHours: {
    [key: string]: {
      open: string;
      close: string;
      isOpen: boolean;
    };
  };
}

export interface Product {
  _id: string;
  name: string;
  nameUz: string;
  nameRu: string;
  description: string;
  price: number;
  image?: string;
  category: string;
  branch: string;
  isActive: boolean;
  ingredients: string[];
  preparationTime: number;
}

export interface Category {
  _id: string;
  name: string;
  nameUz: string;
  nameRu: string;
  description: string;
  icon?: string;
  sortOrder: number;
  branch: string;
  isActive: boolean;
}

export interface Order {
  _id: string;
  orderNumber: string;
  user: User;
  branch: Branch;
  items: OrderItem[];
  totalAmount: number;
  status: 'pending' | 'confirmed' | 'preparing' | 'ready' | 'delivered' | 'cancelled';
  orderType: 'delivery' | 'pickup' | 'dine_in';
  paymentMethod: 'cash' | 'card' | 'online';
  createdAt: Date;
}

export interface OrderItem {
  product: Product;
  quantity: number;
  price: number;
  total: number;
}

// API Response types
export interface ApiResponse<T = any> {
  success: boolean;
  message: string;
  data?: T;
  error?: string;
}

export interface LoginResponse {
  user: User;
  token: string;
}

export interface PaginatedResponse<T> {
  items: T[];
  total: number;
  page: number;
  limit: number;
  totalPages: number;
}