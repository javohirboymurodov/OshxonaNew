// src/components/Common/ErrorBoundary.tsx
import React, { Component, ErrorInfo, ReactNode } from 'react';
import { Result, Button } from 'antd';
import { ReloadOutlined, HomeOutlined } from '@ant-design/icons';

interface Props {
  children: ReactNode;
  fallback?: ReactNode;
}

interface State {
  hasError: boolean;
  error?: Error;
  errorInfo?: ErrorInfo;
}

class ErrorBoundary extends Component<Props, State> {
  constructor(props: Props) {
    super(props);
    this.state = { hasError: false };
  }

  static getDerivedStateFromError(error: Error): State {
    return {
      hasError: true,
      error
    };
  }

  componentDidCatch(error: Error, errorInfo: ErrorInfo) {
    console.error('ErrorBoundary caught an error:', error, errorInfo);
    
    this.setState({
      error,
      errorInfo
    });

    // Log error to monitoring service (e.g., Sentry)
    if (process.env.NODE_ENV === 'production') {
      // logErrorToService(error, errorInfo);
    }
  }

  handleReload = () => {
    window.location.reload();
  };

  handleGoHome = () => {
    window.location.href = '/';
  };

  render() {
    if (this.state.hasError) {
      if (this.props.fallback) {
        return this.props.fallback;
      }

      return (
        <Result
          status="error"
          title="Xatolik yuz berdi"
          subTitle="Nimadir noto'g'ri ketdi. Sahifani yangilang yoki bosh sahifaga qayting."
          extra={[
            <Button 
              type="primary" 
              icon={<ReloadOutlined />} 
              onClick={this.handleReload}
              key="reload"
            >
              Sahifani yangilash
            </Button>,
            <Button 
              icon={<HomeOutlined />} 
              onClick={this.handleGoHome}
              key="home"
            >
              Bosh sahifa
            </Button>
          ]}
        >
          {process.env.NODE_ENV === 'development' && (
            <div style={{ 
              textAlign: 'left', 
              marginTop: 20, 
              padding: 16, 
              backgroundColor: '#f5f5f5',
              borderRadius: 4,
              fontSize: 12,
              fontFamily: 'monospace',
              whiteSpace: 'pre-wrap'
            }}>
              <strong>Error:</strong> {this.state.error?.toString()}
              <br />
              <strong>Stack:</strong> {this.state.errorInfo?.componentStack}
            </div>
          )}
        </Result>
      );
    }

    return this.props.children;
  }
}

export default ErrorBoundary;