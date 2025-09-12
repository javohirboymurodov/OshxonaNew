import React from 'react';
import ProductCard from './ProductCard';
import { Product } from '../types';

interface ProductGridProps {
  products: Product[];
  cart: Record<string, number>;
  onIncrement: (productId: string) => void;
  onDecrement: (productId: string) => void;
}

export default function ProductGrid({ products, cart, onIncrement, onDecrement }: ProductGridProps) {
  console.log('🔍 ProductGrid render:', {
    productsCount: products.length,
    firstProduct: products[0],
    cartKeys: Object.keys(cart)
  });

  if (products.length === 0) {
    console.log('🔍 ProductGrid: No products to display');
    return (
      <div style={{ textAlign: 'center', padding: 40, color: '#666' }}>
        <div style={{ fontSize: 48, marginBottom: 16 }}>🔍</div>
        <div>Mahsulotlar topilmadi</div>
      </div>
    );
  }

  return (
    <div style={{ 
      display: 'grid', 
      gridTemplateColumns: 'repeat(auto-fill,minmax(160px,1fr))', 
      gap: 12 
    }}>
      {products.map(product => (
        <ProductCard
          key={product._id}
          product={product}
          quantity={cart[product._id] || 0}
          onIncrement={() => onIncrement(product._id)}
          onDecrement={() => onDecrement(product._id)}
        />
      ))}
    </div>
  );
}
