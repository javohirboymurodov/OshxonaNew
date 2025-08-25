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

// Lazy load product management components
export const LazyProductList = lazy(() => import('../pages/Products/ProductList'));
export const LazyProductCreate = lazy(() => import('../pages/Products/ProductCreate'));
export const LazyProductEdit = lazy(() => import('../pages/Products/ProductEdit'));

// Lazy load order management components
export const LazyOrderList = lazy(() => import('../pages/Orders/OrderList'));
export const LazyOrderDetail = lazy(() => import('../pages/Orders/OrderDetail'));

// Lazy load user management components
export const LazyUserList = lazy(() => import('../pages/Users/UserList'));
export const LazyUserDetail = lazy(() => import('../pages/Users/UserDetail'));

// Lazy load courier management components
export const LazyCourierList = lazy(() => import('../pages/Couriers/CourierList'));
export const LazyCourierMap = lazy(() => import('../pages/Couriers/CourierMap'));

// Lazy load analytics components
export const LazyAnalytics = lazy(() => import('../pages/Dashboard/Analytics'));
export const LazyReports = lazy(() => import('../pages/Dashboard/Reports'));

// Utility function to create lazy loaded routes
export const createLazyRoute = (Component: React.LazyExoticComponent<any>) => {
  return () => <Component />;
};