// src/components/ProductCard.tsx
import React, { useState } from 'react';

interface Product {
  _id: string;
  name: string;
  price: number;
  image?: string;
  description?: string;
  isPromo?: boolean;
  originalPrice?: number;
}

interface ProductCardProps {
  product: Product;
  quantity: number;
  onQuantityChange: (productId: string, newQuantity: number) => void;
  loading?: boolean;
}

const ProductCard: React.FC<ProductCardProps> = ({ 
  product, 
  quantity, 
  onQuantityChange,
  loading = false 
}) => {
  const [imageLoading, setImageLoading] = useState(true);
  const [imageError, setImageError] = useState(false);

  const handleDecrease = () => {
    console.log(`🔻 ProductCard decrease: ${product.name}, current: ${quantity}`);
    if (quantity > 0) {
      onQuantityChange(product._id, quantity - 1);
    }
  };

  const handleIncrease = () => {
    console.log(`🔺 ProductCard increase: ${product.name}, current: ${quantity}`);
    onQuantityChange(product._id, quantity + 1);
  };

  const cardStyle: React.CSSProperties = {
    border: '1px solid #eee',
    borderRadius: 12,
    padding: 12,
    backgroundColor: '#fff',
    boxShadow: '0 2px 8px rgba(0,0,0,0.06)',
    transition: 'all 0.3s ease',
    opacity: loading ? 0.6 : 1,
    pointerEvents: loading ? 'none' : 'auto'
  };

  const imageStyle: React.CSSProperties = {
    width: '100%',
    height: 120,
    objectFit: 'cover',
    borderRadius: 8,
    marginBottom: 8,
    backgroundColor: '#f5f5f5',
    display: imageLoading || imageError ? 'none' : 'block'
  };

  const imagePlaceholderStyle: React.CSSProperties = {
    width: '100%',
    height: 120,
    backgroundColor: '#f5f5f5',
    borderRadius: 8,
    marginBottom: 8,
    display: 'flex',
    alignItems: 'center',
    justifyContent: 'center',
    color: '#999',
    fontSize: 12
  };

  const priceStyle: React.CSSProperties = {
    fontWeight: 600,
    color: product.isPromo ? '#ff4d4f' : '#333',
    fontSize: 16,
    marginBottom: 8
  };

  const originalPriceStyle: React.CSSProperties = {
    textDecoration: 'line-through',
    color: '#999',
    fontSize: 12,
    marginLeft: 4
  };

  const buttonStyle: React.CSSProperties = {
    width: 32,
    height: 32,
    borderRadius: '50%',
    border: '1px solid #ddd',
    backgroundColor: '#fff',
    display: 'flex',
    alignItems: 'center',
    justifyContent: 'center',
    cursor: 'pointer',
    fontSize: 18,
    fontWeight: 'bold',
    transition: 'all 0.2s ease',
    userSelect: 'none',
    outline: 'none',
    boxShadow: '0 1px 2px rgba(0,0,0,0.1)'
  };

  const quantityStyle: React.CSSProperties = {
    minWidth: 24,
    textAlign: 'center',
    fontWeight: 600,
    fontSize: 16
  };

  return (
    <div style={{...cardStyle, position: 'relative'}}>
      {/* Product Image */}
      {product.image && !imageError ? (
        <img
          src={product.image}
          alt={product.name}
          style={imageStyle}
          onLoad={() => setImageLoading(false)}
          onError={() => {
            setImageError(true);
            setImageLoading(false);
          }}
        />
      ) : (
        <div style={imagePlaceholderStyle}>
          {imageLoading ? 'Yuklanmoqda...' : '🍽️'}
        </div>
      )}

      {/* Product Name */}
      <div style={{ 
        fontWeight: 600, 
        fontSize: 14, 
        marginBottom: 4,
        lineHeight: '1.3',
        minHeight: 36,
        display: '-webkit-box',
        WebkitLineClamp: 2,
        WebkitBoxOrient: 'vertical',
        overflow: 'hidden'
      }}>
        {product.name}
      </div>

      {/* Description */}
      {product.description && (
        <div style={{ 
          color: '#666', 
          fontSize: 12,
          marginBottom: 8,
          display: '-webkit-box',
          WebkitLineClamp: 2,
          WebkitBoxOrient: 'vertical',
          overflow: 'hidden'
        }}>
          {product.description}
        </div>
      )}

      {/* Price */}
      <div style={priceStyle}>
        {product.price.toLocaleString()} so'm
        {product.isPromo && product.originalPrice && (
          <span style={originalPriceStyle}>
            {product.originalPrice.toLocaleString()}
          </span>
        )}
      </div>

      {/* Promo Badge */}
      {product.isPromo && (
        <div style={{
          position: 'absolute',
          top: 8,
          right: 8,
          backgroundColor: '#ff4d4f',
          color: '#fff',
          padding: '2px 6px',
          borderRadius: 4,
          fontSize: 10,
          fontWeight: 600
        }}>
          AKSIYA
        </div>
      )}

      {/* Quantity Controls */}
      <div style={{ 
        display: 'flex', 
        gap: 8, 
        alignItems: 'center', 
        justifyContent: 'center',
        marginTop: 8
      }}>
        <button
          type="button"
          style={{
            ...buttonStyle,
            opacity: quantity > 0 ? 1 : 0.5,
            cursor: quantity > 0 ? 'pointer' : 'not-allowed'
          }}
          onClick={handleDecrease}
          disabled={quantity <= 0}
          onMouseDown={(e) => e.preventDefault()}
        >
          −
        </button>
        
        <div style={quantityStyle}>
          {quantity || 0}
        </div>
        
        <button
          type="button"
          style={buttonStyle}
          onClick={handleIncrease}
          onMouseDown={(e) => e.preventDefault()}
        >
          +
        </button>
      </div>

      {/* Loading Overlay */}
      {loading && (
        <div style={{
          position: 'absolute',
          top: 0,
          left: 0,
          right: 0,
          bottom: 0,
          backgroundColor: 'rgba(255, 255, 255, 0.7)',
          display: 'flex',
          alignItems: 'center',
          justifyContent: 'center',
          borderRadius: 12
        }}>
          <div style={{
            width: 20,
            height: 20,
            border: '2px solid #f3f3f3',
            borderTop: '2px solid #1677ff',
            borderRadius: '50%',
            animation: 'spin 1s linear infinite'
          }}></div>
        </div>
      )}
    </div>
  );
};

export default ProductCard;