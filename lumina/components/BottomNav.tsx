'use client';
import { CalendarDays, Home, LayoutGrid, Sparkles, User } from 'lucide-react';
import Link from 'next/link';
import { usePathname } from 'next/navigation';

const ITEMS = [
  { href: '/', label: 'Сегодня', icon: Home },
  { href: '/planner', label: 'План', icon: CalendarDays },
  { href: '/ai', label: 'AI', icon: Sparkles, center: true },
  { href: '/life', label: 'Жизнь', icon: LayoutGrid },
  { href: '/profile', label: 'Профиль', icon: User },
];

export default function BottomNav() {
  const path = usePathname();
  return (
    <nav className="nav" aria-label="Основная навигация">
      {ITEMS.map(({ href, label, icon: Icon, center }) => {
        const on = href === '/' ? path === '/' : path.startsWith(href);
        if (center) {
          return (
            <Link key={href} href={href} className={`ai-btn ${on ? 'on' : ''}`} aria-label="AI-помощник">
              <div className="orb">
                <Icon size={24} strokeWidth={1.8} />
              </div>
              <span>{label}</span>
            </Link>
          );
        }
        return (
          <Link key={href} href={href} className={on ? 'on' : ''}>
            <Icon size={22} strokeWidth={1.7} />
            {label}
          </Link>
        );
      })}
    </nav>
  );
}
