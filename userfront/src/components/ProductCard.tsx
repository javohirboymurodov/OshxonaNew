import React from 'react';

type Product = { _id: string; name: string; price: number; image?: string; categoryId?: { _id: string; name?: string } };

interface ProductCardProps {
  product: Product;
  quantity: number;
  onIncrement: () => void;
  onDecrement: () => void;
}

export default function ProductCard({ product, quantity, onIncrement, onDecrement }: ProductCardProps) {
  return (
    <div style={{ border:'1px solid #eee', borderRadius:10, padding:10 }}>
      {product.image && (
        <img 
          src={`https://oshxonanew.onrender.com${product.image}`} 
          alt={product.name}
          style={{ width: '100%', height: 120, objectFit: 'cover', borderRadius: 8, marginBottom: 8 }}
        />
      )}
      <div style={{ fontWeight:600, fontSize: 14 }}>{product.name}</div>
      <div style={{ color:'#666', margin:'4px 0', fontSize: 12 }}>{product.price.toLocaleString()} so'm</div>
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