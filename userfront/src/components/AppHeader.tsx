import React from 'react';

export default function AppHeader() {
  return (
    <div style={{ 
      display: 'flex', 
      justifyContent: 'space-between', 
      alignItems: 'center',
      marginBottom: 16
    }}>
      <h3 style={{ margin: 0 }}>🍽️ Katalog</h3>
      <div style={{ display: 'flex', gap: 8 }}>
        <button style={{
          background: 'none',
          border: 'none',
          fontSize: 18,
          cursor: 'pointer',
          color: '#666'
        }}>
          ⋮
        </button>
        <button style={{
          background: 'none',
          border: 'none',
          fontSize: 18,
          cursor: 'pointer',
          color: '#666'
        }}>
          ×
        </button>
      </div>
    </div>
  );
}
