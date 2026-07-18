'use client';
import { useEffect, useState } from 'react';
import { useRouter, usePathname } from 'next/navigation';
import { useAuthStore } from '@/store/authStore';

export default function AuthGuard({ children }: { children: React.ReactNode }) {
  const { isAuthenticated } = useAuthStore();
  const router = useRouter();
  const pathname = usePathname();
  const [isHydrated, setIsHydrated] = useState(false);

  // 1. Wait for the component to mount so Zustand can safely read from localStorage
  useEffect(() => {
    setIsHydrated(true);
  }, []);

  // 2. Evaluate access permissions whenever auth state or path changes
  useEffect(() => {
    if (!isHydrated) return;

    if (!isAuthenticated && pathname !== '/login') {
      // Not logged in -> bounce to login page
      router.replace('/login');
    } else if (isAuthenticated && pathname === '/login') {
      // Already logged in trying to hit login -> redirect to workspace home
      router.replace('/');
    }
  }, [isAuthenticated, isHydrated, pathname, router]);

  // 3. Prevent page layout flashing while parsing credentials on initial load
  if (!isHydrated) {
    return (
      <div className="flex min-h-screen items-center justify-center bg-slate-950 text-slate-400">
        Initializing workspace security...
      </div>
    );
  }

  return <>{children}</>;
}