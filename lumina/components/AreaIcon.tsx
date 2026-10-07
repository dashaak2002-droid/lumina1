import { Activity, Briefcase, Flower2, Heart, Home, Sprout, Users, Wallet, type LucideIcon } from 'lucide-react';
import type { AreaId } from '@/lib/types';

// Иконки сфер жизни. Отдельно от lib/areas.ts, чтобы логика не зависела от интерфейса.
const ICONS: Record<AreaId, LucideIcon> = {
  health: Activity,
  career: Briefcase,
  money: Wallet,
  relationships: Heart,
  family: Users,
  selfcare: Flower2,
  home: Home,
  growth: Sprout,
};

export function AreaIcon({ id, size = 18 }: { id: AreaId; size?: number }) {
  const Icon = ICONS[id];
  return <Icon size={size} strokeWidth={1.7} />;
}
