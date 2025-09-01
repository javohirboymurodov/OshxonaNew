import React from 'react';

type Product = { _id: string; name: string; price: number; image?: string; categoryId?: { _id: string; name?: string } };

interface CartModalProps {
  isOpen: boolean;
  onClose: () => void;
  cart: Record<string, number>;
  products: Product[];
  onUpdateQuantity: (productId: string, quantity: number) => void;
  onPlaceOrder: () => void;
  total: number;
}

export default function CartModal({ isOpen, onClose, cart, products, onUpdateQuantity, onPlaceOrder, total }: CartModalProps) {
  if (!isOpen) return null;

  const cartItems = Object.entries(cart)
    .filter(([_, quantity]) => quantity > 0)
    .map(([productId, quantity]) => ({
      product: products.find(p => p._id === productId)!,
      quantity
    }))
    .filter(item => item.product);

  return (
    <div style={{
      position: 'fixed',
      top: 0,
      left: 0,
      right: 0,
      bottom: 0,
      backgroundColor: 'rgba(0,0,0,0.5)',
      zIndex: 1000,
      display: 'flex',
      alignItems: 'flex-end'
    }}>
      <div style={{
        width: '100%',
        maxHeight: '80vh',
        backgroundColor: '#fff',
        borderRadius: '16px 16px 0 0',
        padding: 16,
        overflowY: 'auto'
      }}>
        {/* Header */}
        <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: 16 }}>
          <h3 style={{ margin: 0 }}>🧺 Savat</h3>
          <button 
            onClick={onClose}
            style={{
              background: 'none',
              border: 'none',
              fontSize: 24,
              cursor: 'pointer',
              color: '#666'
            }}
          >
            ×
          </button>
        </div>

        {/* Cart Items */}
        {cartItems.length === 0 ? (
          <div style={{ textAlign: 'center', padding: 40, color: '#666' }}>
            <div style={{ fontSize: 48, marginBottom: 16 }}>🛒</div>
            <div>Savat bo'sh</div>
          </div>
        ) : (
          <div style={{ marginBottom: 20 }}>
            {cartItems.map(({ product, quantity }) => (
              <div key={product._id} style={{
                display: 'flex',
                alignItems: 'center',
                padding: 12,
                borderBottom: '1px solid #eee'
              }}>
                {product.image && (
                  <img 
                    src={`https://oshxonanew.onrender.com${product.image}`}
                    alt={product.name}
                    style={{ width: 50, height: 50, objectFit: 'cover', borderRadius: 8, marginRight: 12 }}
                  />
                )}
                <div style={{ flex: 1 }}>
                  <div style={{ fontWeight: 600, fontSize: 14 }}>{product.name}</div>
                  <div style={{ color: '#666', fontSize: 12 }}>{product.price.toLocaleString()} so'm</div>
                </div>
                <div style={{ display: 'flex', alignItems: 'center', gap: 8 }}>
                  <button
                    onClick={() => onUpdateQuantity(product._id, Math.max(0, quantity - 1))}
                    style={{
                      width: 28,
                      height: 28,
                      borderRadius: '50%',
                      border: '1px solid #ddd',
                      background: '#fff',
                      display: 'flex',
                      alignItems: 'center',
                      justifyContent: 'center'
                    }}
                  >
                    −
                  </button>
                  <span style={{ minWidth: 20, textAlign: 'center', fontWeight: 600 }}>{quantity}</span>
                  <button
                    onClick={() => onUpdateQuantity(product._id, quantity + 1)}
                    style={{
                      width: 28,
                      height: 28,
                      borderRadius: '50%',
                      border: '1px solid #1677ff',
                      background: '#1677ff',
                      color: '#fff',
                      display: 'flex',
                      alignItems: 'center',
                      justifyContent: 'center'
                    }}
                  >
                    +
                  </button>
                </div>
                <div style={{ marginLeft: 12, fontWeight: 600, minWidth: 80, textAlign: 'right' }}>
                  {(product.price * quantity).toLocaleString()} so'm
                </div>
              </div>
            ))}
          </div>
        )}

        {/* Footer */}
        {cartItems.length > 0 && (
          <div>
            <div style={{
              display: 'flex',
              justifyContent: 'space-between',
              alignItems: 'center',
              padding: '16px 0',
              borderTop: '2px solid #f0f0f0',
              marginBottom: 16
            }}>
              <div style={{ fontSize: 18, fontWeight: 600 }}>Jami:</div>
              <div style={{ fontSize: 20, fontWeight: 700, color: '#1677ff' }}>
                {total.toLocaleString()} so'm
              </div>
            </div>
            <button
              onClick={onPlaceOrder}
              style={{
                width: '100%',
                background: '#52c41a',
                color: '#fff',
                padding: '14px 20px',
                border: 'none',
                borderRadius: 8,
                fontSize: 16,
                fontWeight: 600
              }}
            >
              Buyurtma berish
            </button>
          </div>
        )}
      </div>
    </div>
  );
}