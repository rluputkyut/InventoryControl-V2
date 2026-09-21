import { Navigate, useLocation } from 'react-router-dom';
import type { ReactNode } from 'react';
import { useAuth } from '../auth/AuthContext';
import { Button } from '@/components/ui/button';

export function RequireAuth({ children, roles }: { children: ReactNode; roles?: string[] }) {
  const { user, booting, hasRole } = useAuth();
  const location = useLocation();

  if (booting) {
    return (
      <div className="flex min-h-screen items-center justify-center bg-background">
        <div className="border-primary/30 h-8 w-8 animate-spin rounded-full border-2 border-t-primary" />
      </div>
    );
  }

  if (!user) {
    return <Navigate to="/login" state={{ from: location }} replace />;
  }

  if (roles && !hasRole(...roles)) {
    return (
      <div className="flex min-h-screen flex-col items-center justify-center gap-4 bg-background p-6 text-center">
        <p className="text-4xl font-extrabold text-muted-foreground">403</p>
        <p className="text-muted-foreground">You do not have permission to view this page.</p>
        <Button asChild>
          <a href="/dashboard">Go to dashboard</a>
        </Button>
      </div>
    );
  }

  return <>{children}</>;
}