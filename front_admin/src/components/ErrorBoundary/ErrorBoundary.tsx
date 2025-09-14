import React, { Component, ErrorInfo, ReactNode } from 'react';
import { Result, Button, Space, Typography, Collapse } from 'antd';
import { ReloadOutlined, BugOutlined, HomeOutlined } from '@ant-design/icons';

const { Title, Text } = Typography;
const { Panel } = Collapse;

interface Props {
  children: ReactNode;
  fallback?: ReactNode;
  onError?: (error: Error, errorInfo: ErrorInfo) => void;
  showDetails?: boolean;
}

interface State {
  hasError: boolean;
  error: Error | null;
  errorInfo: ErrorInfo | null;
  errorId: string;
}

class ErrorBoundary extends Component<Props, State> {
  private retryCount = 0;
  private maxRetries = 3;

  constructor(props: Props) {
    super(props);
    this.state = {
      hasError: false,
      error: null,
      errorInfo: null,
      errorId: ''
    };
  }

  static getDerivedStateFromError(error: Error): Partial<State> {
    // Update state so the next render will show the fallback UI
    return {
      hasError: true,
      error,
      errorId: `error_${Date.now()}_${Math.random().toString(36).substr(2, 9)}`
    };
  }

  componentDidCatch(error: Error, errorInfo: ErrorInfo) {
    // Log error details
    this.setState({
      error,
      errorInfo
    });

    // Call custom error handler
    this.props.onError?.(error, errorInfo);

    // Log to console in development
    if (process.env.NODE_ENV === 'development') {
      console.group('🚨 Error Boundary Caught Error');
      console.error('Error:', error);
      console.error('Error Info:', errorInfo);
      console.error('Component Stack:', errorInfo.componentStack);
      console.groupEnd();
    }

    // Send to error reporting service in production
    if (process.env.NODE_ENV === 'production') {
      this.reportError(error, errorInfo);
    }
  }

  private reportError = async (error: Error, errorInfo: ErrorInfo) => {
    try {
      const errorReport = {
        errorId: this.state.errorId,
        message: error.message,
        stack: error.stack,
        componentStack: errorInfo.componentStack,
        timestamp: new Date().toISOString(),
        userAgent: navigator.userAgent,
        url: window.location.href,
        userId: localStorage.getItem('userId') || 'anonymous'
      };

      // Send to backend error reporting endpoint
      await fetch('/api/errors', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          'Authorization': `Bearer ${localStorage.getItem('token')}`
        },
        body: JSON.stringify(errorReport)
      });
    } catch (reportingError) {
      console.warn('Failed to report error:', reportingError);
    }
  };

  private handleRetry = () => {
    this.retryCount++;
    
    if (this.retryCount <= this.maxRetries) {
      this.setState({
        hasError: false,
        error: null,
        errorInfo: null,
        errorId: ''
      });
    } else {
      // After max retries, reload the page
      window.location.reload();
    }
  };

  private handleGoHome = () => {
    window.location.href = '/';
  };

  private handleReload = () => {
    window.location.reload();
  };

  private renderErrorDetails = () => {
    const { error, errorInfo, errorId } = this.state;
    
    if (!this.props.showDetails || !error) return null;

    return (
      <Collapse size="small" style={{ marginTop: 16 }}>
        <Panel header="Technical Details (for developers)" key="details">
          <Space direction="vertical" style={{ width: '100%' }}>
            <div>
              <Text strong>Error ID:</Text> <Text code>{errorId}</Text>
            </div>
            
            <div>
              <Text strong>Error Message:</Text>
              <pre style={{ 
                background: '#f5f5f5', 
                padding: '8px', 
                borderRadius: '4px',
                fontSize: '12px',
                overflow: 'auto',
                maxHeight: '200px'
              }}>
                {error.message}
              </pre>
            </div>
            
            {error.stack && (
              <div>
                <Text strong>Stack Trace:</Text>
                <pre style={{ 
                  background: '#f5f5f5', 
                  padding: '8px', 
                  borderRadius: '4px',
                  fontSize: '11px',
                  overflow: 'auto',
                  maxHeight: '300px'
                }}>
                  {error.stack}
                </pre>
              </div>
            )}
            
            {errorInfo?.componentStack && (
              <div>
                <Text strong>Component Stack:</Text>
                <pre style={{ 
                  background: '#f5f5f5', 
                  padding: '8px', 
                  borderRadius: '4px',
                  fontSize: '11px',
                  overflow: 'auto',
                  maxHeight: '200px'
                }}>
                  {errorInfo.componentStack}
                </pre>
              </div>
            )}
          </Space>
        </Panel>
      </Collapse>
    );
  };

  render() {
    if (this.state.hasError) {
      // Custom fallback UI
      if (this.props.fallback) {
        return this.props.fallback;
      }

      // Default error UI
      return (
        <div style={{ 
          padding: '40px 20px',
          minHeight: '50vh',
          display: 'flex',
          alignItems: 'center',
          justifyContent: 'center'
        }}>
          <Result
            status="error"
            icon={<BugOutlined />}
            title="Something went wrong"
            subTitle={
              <Space direction="vertical" size="small">
                <Text type="secondary">
                  An unexpected error occurred. Please try again or contact support if the problem persists.
                </Text>
                {this.retryCount > 0 && (
                  <Text type="warning">
                    Retry attempt: {this.retryCount}/{this.maxRetries}
                  </Text>
                )}
              </Space>
            }
            extra={
              <Space>
                <Button 
                  type="primary" 
                  icon={<ReloadOutlined />}
                  onClick={this.handleRetry}
                  disabled={this.retryCount >= this.maxRetries}
                >
                  {this.retryCount >= this.maxRetries ? 'Max Retries Reached' : 'Try Again'}
                </Button>
                
                <Button 
                  icon={<HomeOutlined />}
                  onClick={this.handleGoHome}
                >
                  Go Home
                </Button>
                
                <Button 
                  onClick={this.handleReload}
                >
                  Reload Page
                </Button>
              </Space>
            }
          />
          
          {this.renderErrorDetails()}
        </div>
      );
    }

    return this.props.children;
  }
}

// HOC for wrapping components with error boundary
export const withErrorBoundary = <P extends object>(
  Component: React.ComponentType<P>,
  errorBoundaryProps?: Omit<Props, 'children'>
) => {
  const WrappedComponent = (props: P) => (
    <ErrorBoundary {...errorBoundaryProps}>
      <Component {...props} />
    </ErrorBoundary>
  );
  
  WrappedComponent.displayName = `withErrorBoundary(${Component.displayName || Component.name})`;
  
  return WrappedComponent;
};

// Hook for error boundary context
export const useErrorHandler = () => {
  const handleError = React.useCallback((error: Error, errorInfo?: string) => {
    console.error('Error caught by hook:', error);
    
    // Report error
    if (process.env.NODE_ENV === 'production') {
      // Send to error reporting service
      fetch('/api/errors', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          message: error.message,
          stack: error.stack,
          context: errorInfo,
          timestamp: new Date().toISOString()
        })
      }).catch(console.warn);
    }
  }, []);

  return { handleError };
};

export default ErrorBoundary;