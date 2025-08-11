export interface Product {
  _id: string;
  name: string;
  description: string;
  price: number;
  categoryId: {
    _id: string;
    name: string;
    emoji: string;
  };
  isActive: boolean;
  image?: string;
  imageFileId?: string;
  createdAt: string;
}

export interface Category {
  _id: string;
  name: string;
  emoji: string;
}

export interface FormData {
  name: string;
  description: string;
  price: number;
  categoryId: string;
  isActive: boolean;
}