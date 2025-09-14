import React from 'react';
import { ConfigProvider } from 'antd/lib/config-provider';
import { BrowserRouter } from 'react-router-dom';
import { Provider } from 'react-redux';
import uzUZ from 'antd/locale/uz_UZ';
import dayjs from 'dayjs';
import 'dayjs/locale/uz-latn';

import { AuthProvider } from '@/hooks/useAuth';
import { QueryClient, QueryClientProvider } from '@tanstack/react-query';
import { store } from './store';
import { SoundPlayer } from '@/utils/sound';
import { ErrorBoundary } from '@/components/ErrorBoundary';
import { performanceMonitor } from '@/utils/performance';

import AppRouter from '@/router/AppRouter';
import './App.css';

dayjs.locale('uz-latn');

// Custom theme
const theme = {
  token: {
    colorPrimary: '#1890ff',
    colorSuccess: '#52c41a',
    colorWarning: '#faad14',
    colorError: '#ff4d4f',
    borderRadius: 8,
    fontSize: 14,
  },
  components: {
    Layout: {
      headerBg: '#001529',
      siderBg: '#001529',
    },
    Menu: {
      darkItemBg: '#001529',
      darkSubMenuItemBg: '#000c17',
    },
  },
};

function App() {
  const queryClient = React.useMemo(() => new QueryClient(), []);
  
  // Preload notification sounds
  React.useEffect(() => {
    SoundPlayer.preloadSounds();
    
    // Initialize performance monitoring
    if (process.env.NODE_ENV === 'development') {
      performanceMonitor.reportToConsole();
      
      // Report performance every 30 seconds in development
      const interval = setInterval(() => {
        performanceMonitor.reportToConsole();
      }, 30000);
      
      return () => clearInterval(interval);
    }
  }, []);
  
  return (
    <ErrorBoundary showDetails={process.env.NODE_ENV === 'development'}>
      <Provider store={store}>
        <ConfigProvider 
          theme={theme}
          locale={uzUZ}
        >
          <QueryClientProvider client={queryClient}>
            <AuthProvider>
              <BrowserRouter>
                <AppRouter />
              </BrowserRouter>
            </AuthProvider>
          </QueryClientProvider>
        </ConfigProvider>
      </Provider>
    </ErrorBoundary>
  );
}

export default App;
