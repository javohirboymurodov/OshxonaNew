export interface AppSettings {
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

export interface Branch {
  _id: string;
  name: string;
  address: string;
  phone: string;
  workingHours: {
    start: string;
    end: string;
  };
  isActive: boolean;
  deliveryRadius: number;
  deliveryFee: number;
}

export interface TableItem {
  _id: string;
  branch: string;
  number: number;
  capacity?: number;
  location?: string;
  isActive?: boolean;
  isOccupied?: boolean;
  createdAt?: string;
  updatedAt?: string;
}

export interface NotificationSettings {
  newOrderNotification: boolean;
  orderStatusNotification: boolean;
  lowStockNotification: boolean;
  dailyReportNotification: boolean;
  emailNotifications: boolean;
  telegramNotifications: boolean;
  telegramBotToken: string;
  telegramChatId: string;
}


