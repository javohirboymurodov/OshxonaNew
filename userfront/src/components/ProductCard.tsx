import React from 'react';
import { Product } from '../types';

interface ProductCardProps {
  product: Product;
  quantity: number;
  onIncrement: () => void;
  onDecrement: () => void;
}

export default function ProductCard({ product, quantity, onIncrement, onDecrement }: ProductCardProps) {
  return (
    <div 
      data-product-card
      data-product-id={product._id}
      data-category-id={product.categoryId?._id}
      style={{ 
        border:'1px solid #eee', 
        borderRadius:10, 
        padding:10,
        backgroundColor: '#fff'
      }}
    >
      {product.image && (
        <img 
          src={`https://oshxonanew.onrender.com${product.image}`} 
          alt={product.name}
          style={{ width: '100%', height: 120, objectFit: 'cover', borderRadius: 8, marginBottom: 8 }}
        />
      )}
      <div style={{ fontWeight:600, fontSize: 14 }}>{product.name}</div>
      <div style={{ margin:'4px 0', fontSize: 12 }}>
        {product.originalPrice && product.originalPrice > product.price ? (
          <div>
            <span style={{ color:'#ff4d4f', textDecoration: 'line-through', fontSize: 10 }}>
              {product.originalPrice.toLocaleString()} so'm
            </span>
            <br />
            <span style={{ color:'#52c41a', fontWeight: 600 }}>
              {product.price.toLocaleString()} so'm
            </span>
            <span style={{ color:'#ff4d4f', fontSize: 10, marginLeft: 4 }}>
              -{Math.round(((product.originalPrice - product.price) / product.originalPrice) * 100)}%
            </span>
          </div>
        ) : (
          <span style={{ color:'#666' }}>{product.price.toLocaleString()} so'm</span>
        )}
      </div>
      <div style={{ display:'flex', gap:6, alignItems:'center', justifyContent:'center', marginTop: 8 }}>
        <button 
          onClick={onDecrement} 
          style={{ 
            width: 30, 
            height: 30, 
            borderRadius: '50%', 
            border: '1px solid #ddd', 
            background: '#fff',
            display: 'flex',
            alignItems: 'center',
            justifyContent: 'center',
            fontSize: 18
          }}
        >
          −
        </button>
        <div style={{ minWidth: 30, textAlign: 'center', fontWeight: 600 }}>{quantity}</div>
        <button 
          onClick={onIncrement} 
          style={{ 
            width: 30, 
            height: 30, 
            borderRadius: '50%', 
            border: '1px solid #1677ff', 
            background: '#1677ff',
            color: '#fff',
            display: 'flex',
            alignItems: 'center',
            justifyContent: 'center',
            fontSize: 18
          }}
        >
          +
        </button>
      </div>
    </div>
  );
}