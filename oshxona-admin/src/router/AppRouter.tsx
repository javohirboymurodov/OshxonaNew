// src/router/AppRouter.tsx
import React from 'react';
import { Routes, Route, Navigate } from 'react-router-dom';
import { useAuth } from '../hooks/useAuth';

import LoginPage from '../pages/Login/LoginPage';
import MainLayout from '@/components/Layout/MainLayout';
import LoadingSpinner from '@/components/Layout/LoadingSpinner';
import LazyLoader from '@/components/LazyLoader';

// Lazy loaded components for better performance
import {
  LazyDashboard,
  LazyProducts,
  LazyCategories,
  LazyOrders,
  LazyUsers,
  LazyCouriers,
  LazySettings,
  LazyProfile
} from '@/components/LazyComponents';

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
        {isSuper && (
          <Route 
            path="/dashboard" 
            element={
              <LazyLoader>
                <LazyDashboard />
              </LazyLoader>
            } 
          />
        )}
        <Route 
          path="/categories" 
          element={
            <LazyLoader>
              <LazyCategories />
            </LazyLoader>
          } 
        />
        <Route 
          path="/products" 
          element={
            <LazyLoader>
              <LazyProducts />
            </LazyLoader>
          } 
        />
        <Route 
          path="/orders" 
          element={
            <LazyLoader>
              <LazyOrders />
            </LazyLoader>
          } 
        />
        <Route 
          path="/couriers" 
          element={
            <LazyLoader>
              <LazyCouriers />
            </LazyLoader>
          } 
        />
        {isSuper && (
          <Route 
            path="/users" 
            element={
              <LazyLoader>
                <LazyUsers />
              </LazyLoader>
            } 
          />
        )}
        <Route
          path="/settings"
          element={
            isSuper ? (
              <LazyLoader>
                <LazySettings />
              </LazyLoader>
            ) : (
              <Navigate to="/orders" replace />
            )
          }
        />
        <Route 
          path="/profile" 
          element={
            <LazyLoader>
              <LazyProfile />
            </LazyLoader>
          } 
        />
        <Route path="/" element={<Navigate to={isSuper ? '/dashboard' : '/orders'} />} />
        <Route path="*" element={<Navigate to={isSuper ? '/dashboard' : '/orders'} />} />
      </Routes>
    </MainLayout>
  );
};

export default AppRouter;