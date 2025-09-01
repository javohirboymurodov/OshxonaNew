import React from 'react';

interface BottomBarProps {
  total: number;
  itemCount: number;
  onOpenCart: () => void;
  onPlaceOrder: () => void;
}

export default function BottomBar({ total, itemCount, onOpenCart, onPlaceOrder }: BottomBarProps) {
  if (itemCount === 0) return null;

  return (
    <div style={{
      position: 'fixed',
      left: 0,
      right: 0,
      bottom: 0,
      padding: 16,
      background: '#fff',
      borderTop: '1px solid #eee',
      display: 'flex',
      gap: 12,
      alignItems: 'center',
      boxShadow: '0 -2px 10px rgba(0,0,0,0.1)'
    }}>
      <button
        onClick={onOpenCart}
        style={{
          flex: 1,
          display: 'flex',
          alignItems: 'center',
          justifyContent: 'center',
          padding: '12px 16px',
          border: '1px solid #1677ff',
          background: '#fff',
          color: '#1677ff',
          borderRadius: 8,
          fontSize: 14,
          fontWeight: 600
        }}
      >
        🧺 Savat ({itemCount})
      </button>
      <div style={{ 
        display: 'flex', 
        flexDirection: 'column', 
        alignItems: 'center',
        minWidth: 100
      }}>
        <div style={{ fontSize: 12, color: '#666' }}>Jami</div>
        <div style={{ fontSize: 16, fontWeight: 700, color: '#1677ff' }}>
          {total.toLocaleString()} so'm
        </div>
      </div>
      <button
        onClick={onPlaceOrder}
        style={{
          flex: 1,
          background: '#52c41a',
          color: '#fff',
          padding: '12px 16px',
          border: 'none',
          borderRadius: 8,
          fontSize: 14,
          fontWeight: 600
        }}
      >
        Buyurtma berish
      </button>
    </div>
  );
}
