import { lazy } from 'react';

// Lazy load all major page components
export const LazyDashboard = lazy(() => import('../pages/Dashboard'));
export const LazyOrders = lazy(() => import('../pages/Orders'));
export const LazyProducts = lazy(() => import('../pages/Products'));
export const LazyCategories = lazy(() => import('../pages/Categories'));
export const LazyUsers = lazy(() => import('../pages/Users'));
export const LazyCouriers = lazy(() => import('../pages/Couriers'));
export const LazySettings = lazy(() => import('../pages/Settings'));
export const LazyProfile = lazy(() => import('../pages/Profile'));
export const LazyLogin = lazy(() => import('../pages/Login'));

// Note: Sub-components will be added when they exist
// For now, we only load the main page components

// Utility function to create lazy loaded routes
export const createLazyRoute = (Component: React.LazyExoticComponent<any>) => {
  return () => <Component />;
};