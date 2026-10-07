'use client';
import { usePathname, useRouter } from 'next/navigation';
import { useEffect, type ReactNode } from 'react';
import { StoreProvider, useStore } from '@/lib/store';
import { useReminders } from '@/lib/reminders';
import BottomNav from './BottomNav';

// Оболочка приложения: подключает хранилище данных и следит,
// чтобы новая пользовательница сначала прошла онбординг.
export default function AppShell({ children }: { children: ReactNode }) {
  return (
    <StoreProvider>
      <Guard>{children}</Guard>
    </StoreProvider>
  );
}

function Guard({ children }: { children: ReactNode }) {
  const { ready, state } = useStore();
  const path = usePathname();
  const router = useRouter();
  const onboarding = path === '/onboarding';
  const hasProfile = !!state.profile;
  useReminders();

  useEffect(() => {
    if (!ready) return;
    if (!hasProfile && !onboarding) router.replace('/onboarding');
    if (hasProfile && onboarding) router.replace('/');
  }, [ready, hasProfile, onboarding, router]);

  if (!ready || (!hasProfile && !onboarding) || (hasProfile && onboarding)) {
    return <div className="splash">Lumina</div>;
  }
  return (
    <>
      {children}
      {hasProfile && <BottomNav />}
    </>
  );
}
