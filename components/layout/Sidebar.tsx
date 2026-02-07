'use client';

import Link from 'next/link';
import { usePathname } from 'next/navigation';
import { Home, User, Settings } from 'lucide-react';
import { useAuth } from '@/hooks/useAuth';

interface SidebarItem {
  href: string;
  icon: typeof Home;
  label: string;
  authRequired?: boolean;
}

const sidebarItems: SidebarItem[] = [
  { href: '/', icon: Home, label: 'Home' },
  { href: '/profile', icon: User, label: 'Profile', authRequired: true },
  { href: '/settings', icon: Settings, label: 'Settings', authRequired: true },
];

interface SidebarProps {
  className?: string;
}

export function Sidebar({ className }: SidebarProps) {
  const pathname = usePathname();
  const { isLoggedIn } = useAuth();

  return (
    <aside
      className={`w-64 bg-white border-r border-gray-200 min-h-screen ${className || ''}`}
      role="navigation"
      aria-label="Sidebar navigation"
    >
      <nav className="p-4 space-y-2">
        {sidebarItems.map((item) => {
          if (item.authRequired && !isLoggedIn) return null;

          const isActive = pathname === item.href;
          const Icon = item.icon;

          return (
            <Link
              key={item.href}
              href={item.href}
              className={`flex items-center gap-3 px-4 py-3 rounded-lg transition-colors ${
                isActive
                  ? 'bg-blue-50 text-blue-700'
                  : 'text-gray-600 hover:bg-gray-50 hover:text-gray-900'
              }`}
              aria-current={isActive ? 'page' : undefined}
            >
              <Icon className="w-5 h-5" aria-hidden="true" />
              <span className="font-medium">{item.label}</span>
            </Link>
          );
        })}
      </nav>
    </aside>
  );
}
