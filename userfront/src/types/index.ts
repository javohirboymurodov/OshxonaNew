export type Product = { 
  _id: string; 
  name: string; 
  price: number; 
  originalPrice?: number; 
  image?: string; 
  categoryId?: { _id: string; name?: string } 
};

export type Category = { 
  _id: string; 
  name: string 
};

export type Branch = { 
  _id: string; 
  name: string; 
  title?: string 
};
