// src/components/LoadingSpinner.tsx
import React from 'react';

interface LoadingSpinnerProps {
  size?: 'small' | 'medium' | 'large';
  text?: string;
  fullScreen?: boolean;
}

const LoadingSpinner: React.FC<LoadingSpinnerProps> = ({ 
  size = 'medium', 
  text = 'Yuklanmoqda...', 
  fullScreen = false 
}) => {
  const getSize = () => {
    switch (size) {
      case 'small': return 20;
      case 'large': return 40;
      default: return 30;
    }
  };

  const spinnerStyle: React.CSSProperties = {
    width: getSize(),
    height: getSize(),
    border: '3px solid #f3f3f3',
    borderTop: '3px solid #1677ff',
    borderRadius: '50%',
    animation: 'spin 1s linear infinite'
  };

  const containerStyle: React.CSSProperties = fullScreen ? {
    position: 'fixed',
    top: 0,
    left: 0,
    right: 0,
    bottom: 0,
    display: 'flex',
    flexDirection: 'column',
    justifyContent: 'center',
    alignItems: 'center',
    backgroundColor: 'rgba(255, 255, 255, 0.8)',
    zIndex: 9999
  } : {
    display: 'flex',
    flexDirection: 'column',
    justifyContent: 'center',
    alignItems: 'center',
    padding: '20px'
  };

  return (
    <>
      <style>
        {`
          @keyframes spin {
            0% { transform: rotate(0deg); }
            100% { transform: rotate(360deg); }
          }
        `}
      </style>
      <div style={containerStyle}>
        <div style={spinnerStyle}></div>
        {text && (
          <div style={{ 
            marginTop: 10, 
            color: '#666', 
            fontSize: 14,
            textAlign: 'center'
          }}>
            {text}
          </div>
        )}
      </div>
    </>
  );
};

export default LoadingSpinner;