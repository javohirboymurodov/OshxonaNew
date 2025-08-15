// src/router/AppRouter.tsx
import React from 'react';
import { Routes, Route, Navigate } from 'react-router-dom';
import { useAuth } from '../hooks/useAuth';

import LoginPage from '../pages/Login/LoginPage';
import MainLayout from '@/components/Layout/MainLayout';
import LoadingSpinner from '@/components/Layout/LoadingSpinner';

// Real components
import DashboardPage from '@/pages/Dashboard/DashboardPage';
import CategoriesPage from '@/pages/Categories/CategoriesPage'
import ProductsPage from '@/pages/Products/index';
import OrdersPage from '@/pages/Orders/OrdersPage';
import UsersPage from '@/pages/Users/UsersPage';
import CouriersPage from '@/pages/Couriers/CouriersPage';
import SettingsPage from '@/pages/Settings/SettingsPage';
import ProfilePage from '@/pages/Profile/ProfilePage';

const AppRouter: React.FC = () => {
  const { user, loading } = useAuth();

  if (loading) {
    return <LoadingSpinner />;
  }

  if (!user) {
    return (
      <Routes>
        <Route path="/login" element={<LoginPage />} />
        <Route path="*" element={<Navigate to="/login" />} />
      </Routes>
    );
  }

  const isSuper = (user as any)?.role === 'superadmin';
  return (
    <MainLayout>
      <Routes>
        {isSuper && <Route path="/dashboard" element={<DashboardPage />} />}
        <Route path="/categories" element={<CategoriesPage />} />
        <Route path="/products" element={<ProductsPage />} />
        <Route path="/orders" element={<OrdersPage />} />
        <Route path="/couriers" element={<CouriersPage />} />
        {isSuper && <Route path="/users" element={<UsersPage />} />}
        <Route
          path="/settings"
          element={isSuper ? <SettingsPage /> : <Navigate to="/orders" replace />}
        />
        <Route path="/profile" element={<ProfilePage />} />
        <Route path="/" element={<Navigate to={isSuper ? '/dashboard' : '/orders'} />} />
        <Route path="*" element={<Navigate to={isSuper ? '/dashboard' : '/orders'} />} />
      </Routes>
    </MainLayout>
  );
};

export default AppRouter;