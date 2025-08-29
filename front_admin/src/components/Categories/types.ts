export interface CategoryStats {
  totalProducts?: number;
  totalOrders?: number;
  totalViews?: number;
  totalRevenue?: number;
}

export interface Category {
  _id: string;
  name: string;
  nameUz: string;
  nameRu: string;
  nameEn: string;
  description?: string;
  image?: string;
  isActive: boolean;
  isVisible?: boolean;
  sortOrder?: number;
  createdAt?: string;
  stats?: CategoryStats;
  currentStats?: CategoryStats;
}


