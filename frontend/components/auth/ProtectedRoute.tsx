// components/auth/ProtectedRoute.tsx
"use client";

import { useEffect } from 'react';
import { useSelector } from 'react-redux';
import { useRouter } from 'next/navigation';
import { RootState } from '@/lib/store';

interface ProtectedRouteProps {
  children: React.ReactNode;
  roles?: string[];
}

export const ProtectedRoute: React.FC<ProtectedRouteProps> = ({ 
  children, 
  roles = [] 
}) => {
  const { isAuthenticated, user, loading } = useSelector((state: RootState) => state.auth);
  const router = useRouter();

  useEffect(() => {
    // Wait for auth validation to complete (null = pending)
    if (loading || isAuthenticated === null) return;

    if (!isAuthenticated) {
      router.push('/login');
      return;
    }

    if (isAuthenticated && user && roles.length > 0) {
      if (!roles.includes(user.role)) {
        router.push('/unauthorized');
        return;
      }
    }
  }, [isAuthenticated, user, loading, router, roles]);

  if (loading || isAuthenticated === null) {
    return (
      <div className="min-h-screen flex items-center justify-center">
        <div className="animate-spin rounded-full h-32 w-32 border-b-2 border-gray-900"></div>
      </div>
    );
  }

  if (!isAuthenticated || (roles.length > 0 && user && !roles.includes(user.role))) {
    return null;
  }

  return <>{children}</>;
};
