export interface User {
  _id: string;
  chatId: string;
  firstName: string;
  lastName?: string;
  username?: string;
  phone?: string;
  email?: string;
  language: 'uz' | 'ru' | 'en';
  role: 'user' | 'admin' | 'superadmin';
  isActive: boolean;
  isBlocked: boolean;
  isNew: boolean;
  registrationDate: Date;
  lastActivity: Date;
  address?: string;
  deliveryAddresses: Address[];
  preferences: UserPreferences;
}

export interface Address {
  _id: string;
  title: string;
  address: string;
  latitude?: number;
  longitude?: number;
  isDefault: boolean;
}

export interface UserPreferences {
  notifications: boolean;
  language: 'uz' | 'ru' | 'en';
  theme: 'light' | 'dark';
}

export interface Product {
  _id: string;
  name: string;
  description: string;
  price: number;
  discount?: number;
  discountPrice?: number;
  images: string[];
  category: string;
  categoryId: string;
  isAvailable: boolean;
  ingredients?: string[];
  nutritionInfo?: NutritionInfo;
  tags: string[];
  rating: number;
  reviewCount: number;
  preparationTime: number;
  createdAt: Date;
  updatedAt: Date;
}

export interface NutritionInfo {
  calories: number;
  protein: number;
  carbs: number;
  fat: number;
}

export interface Category {
  _id: string;
  name: string;
  description?: string;
  image?: string;
  icon?: string;
  isActive: boolean;
  sortOrder: number;
  productCount: number;
}

export interface CartItem {
  productId: string;
  product: Product;
  quantity: number;
  selectedOptions?: SelectedOption[];
  specialInstructions?: string;
  price: number;
}

export interface SelectedOption {
  name: string;
  value: string;
  price: number;
}

export interface Order {
  _id: string;
  orderNumber: string;
  userId: string;
  user: User;
  items: OrderItem[];
  status: OrderStatus;
  paymentMethod: PaymentMethod;
  paymentStatus: PaymentStatus;
  totalAmount: number;
  deliveryFee: number;
  discountAmount: number;
  finalAmount: number;
  deliveryAddress: Address;
  deliveryTime?: Date;
  estimatedDeliveryTime?: Date;
  specialInstructions?: string;
  promoCode?: string;
  createdAt: Date;
  updatedAt: Date;
}

export interface OrderItem {
  productId: string;
  product: Product;
  quantity: number;
  price: number;
  selectedOptions?: SelectedOption[];
  specialInstructions?: string;
}

export type OrderStatus = 
  | 'pending'
  | 'confirmed'
  | 'preparing'
  | 'ready'
  | 'out_for_delivery'
  | 'delivered'
  | 'cancelled';

export type PaymentMethod = 'cash' | 'card' | 'online';
export type PaymentStatus = 'pending' | 'paid' | 'failed' | 'refunded';

export interface DeliveryZone {
  _id: string;
  name: string;
  coordinates: Coordinate[];
  deliveryFee: number;
  minOrderAmount: number;
  deliveryTime: number;
  isActive: boolean;
}

export interface Coordinate {
  latitude: number;
  longitude: number;
}

export interface Review {
  _id: string;
  userId: string;
  user: User;
  productId: string;
  product: Product;
  rating: number;
  comment?: string;
  images?: string[];
  isVerified: boolean;
  createdAt: Date;
  updatedAt: Date;
}

export interface PromoCode {
  _id: string;
  code: string;
  type: 'percentage' | 'fixed' | 'free_delivery';
  value: number;
  minOrderAmount: number;
  maxDiscountAmount?: number;
  usageLimit: number;
  usedCount: number;
  startDate: Date;
  endDate: Date;
  isActive: boolean;
  applicableProducts?: string[];
  applicableCategories?: string[];
}

export interface Notification {
  _id: string;
  userId: string;
  title: string;
  message: string;
  type: 'order' | 'promotion' | 'system' | 'reminder';
  isRead: boolean;
  data?: any;
  createdAt: Date;
}

// API Response Types
export interface ApiResponse<T> {
  success: boolean;
  data?: T;
  message?: string;
  error?: string;
}

export interface PaginatedResponse<T> {
  data: T[];
  total: number;
  page: number;
  limit: number;
  totalPages: number;
}

// Socket Event Types
export interface SocketEvents {
  'order-status-update': {
    orderId: string;
    status: OrderStatus;
    message?: string;
  };
  'new-order': Order;
  'order-cancelled': {
    orderId: string;
    reason: string;
  };
  'delivery-update': {
    orderId: string;
    location: Coordinate;
    estimatedTime: number;
  };
}

// Form Types
export interface LoginForm {
  phone: string;
  verificationCode?: string;
}

export interface AddressForm {
  title: string;
  address: string;
  latitude?: number;
  longitude?: number;
  isDefault: boolean;
}

export interface OrderForm {
  items: CartItem[];
  deliveryAddress: Address;
  paymentMethod: PaymentMethod;
  specialInstructions?: string;
  promoCode?: string;
  deliveryTime?: 'now' | 'scheduled';
  scheduledTime?: Date;
}

export interface ReviewForm {
  productId: string;
  rating: number;
  comment?: string;
  images?: File[];
}
