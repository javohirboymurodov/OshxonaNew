// Centralized Order Status Configuration
// Synced with backend OrderStatusService

export type OrderStatus = 
  | 'pending'
  | 'confirmed' 
  | 'assigned'
  | 'ready'
  | 'on_delivery'
  | 'delivered'
  | 'picked_up'
  | 'completed'
  | 'cancelled';

export interface StatusConfig {
  key: OrderStatus;
  text: string;
  color: string;
  icon: string;
  description: string;
}

// Status configurations matching backend OrderStatusService
export const STATUS_CONFIGS: Record<OrderStatus, StatusConfig> = {
  pending: {
    key: 'pending',
    text: 'Kutilmoqda',
    color: 'orange',
    icon: '⏳',
    description: 'Buyurtma kutilmoqda'
  },
  confirmed: {
    key: 'confirmed',
    text: 'Tasdiqlandi',
    color: 'blue', 
    icon: '✅',
    description: 'Buyurtma tasdiqlandi'
  },
  assigned: {
    key: 'assigned',
    text: 'Kuryer tayinlandi',
    color: 'cyan',
    icon: '🚚',
    description: 'Kuryerga tayinlandi'
  },
  ready: {
    key: 'ready',
    text: 'Tayyor',
    color: 'green',
    icon: '🎯',
    description: 'Buyurtma tayyor'
  },
  on_delivery: {
    key: 'on_delivery', 
    text: 'Yetkazilmoqda',
    color: 'geekblue',
    icon: '🚗',
    description: 'Kuryer yetkazmoqda'
  },
  delivered: {
    key: 'delivered',
    text: 'Yetkazildi',
    color: 'green',
    icon: '✅',
    description: 'Buyurtma yetkazildi'
  },
  picked_up: {
    key: 'picked_up',
    text: 'Olib ketildi',
    color: 'green',
    icon: '📦',
    description: 'Buyurtma olib ketildi'
  },
  completed: {
    key: 'completed',
    text: 'Yakunlandi',
    color: 'green',
    icon: '🎉',
    description: 'Buyurtma yakunlandi'
  },
  cancelled: {
    key: 'cancelled',
    text: 'Bekor qilindi',
    color: 'red',
    icon: '❌',
    description: 'Buyurtma bekor qilindi'
  }
};

// Valid status transitions (matching backend)
export const STATUS_FLOW: Record<OrderStatus, OrderStatus[]> = {
  pending: ['confirmed', 'cancelled'],
  confirmed: ['ready', 'cancelled'],
  assigned: ['on_delivery', 'cancelled'],
  ready: ['assigned', 'delivered', 'picked_up'], // delivery: assigned, dine-in/table: delivered, pickup: picked_up
  on_delivery: ['delivered'],
  delivered: ['completed'],
  picked_up: ['completed'],
  completed: [],
  cancelled: []
};

// Utility functions
export const getStatusConfig = (status: OrderStatus): StatusConfig => {
  return STATUS_CONFIGS[status] || STATUS_CONFIGS.pending;
};

export const getValidNextStatuses = (currentStatus: OrderStatus): OrderStatus[] => {
  return STATUS_FLOW[currentStatus] || [];
};

export const isValidTransition = (from: OrderStatus, to: OrderStatus): boolean => {
  if (from === to) return true; // Allow same status
  return getValidNextStatuses(from).includes(to);
};

export const getStatusColor = (status: OrderStatus): string => {
  return getStatusConfig(status).color;
};

export const getStatusText = (status: OrderStatus): string => {
  return getStatusConfig(status).text;
};

export const getStatusIcon = (status: OrderStatus): string => {
  return getStatusConfig(status).icon;
};

// For dropdown/select options
export const getStatusOptions = (): Array<{value: OrderStatus, label: string, color: string}> => {
  return Object.values(STATUS_CONFIGS).map(config => ({
    value: config.key,
    label: config.text,
    color: config.color
  }));
};

// Get next status options for current status
export const getNextStatusOptions = (currentStatus: OrderStatus): Array<{value: OrderStatus, label: string, color: string}> => {
  const validNext = getValidNextStatuses(currentStatus);
  return validNext.map(status => ({
    value: status,
    label: getStatusText(status),
    color: getStatusColor(status)
  }));
};