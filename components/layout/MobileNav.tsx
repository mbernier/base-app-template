'use client';

import Link from 'next/link';
import { usePathname } from 'next/navigation';
import { Home, User } from 'lucide-react';
import { useAuth } from '@/hooks/useAuth';

interface NavItem {
  href: string;
  icon: typeof Home;
  label: string;
  authRequired?: boolean;
}

const navItems: NavItem[] = [
  { href: '/', icon: Home, label: 'Home' },
  { href: '/profile', icon: User, label: 'Profile', authRequired: true },
];

interface MobileNavProps {
  className?: string;
}

export function MobileNav({ className }: MobileNavProps) {
  const pathname = usePathname();
  const { isLoggedIn } = useAuth();

  return (
    <nav
      className={`fixed bottom-0 left-0 right-0 bg-white border-t border-gray-200 ${className || ''}`}
      role="navigation"
      aria-label="Mobile navigation"
    >
      <div className="flex justify-around items-center h-16">
        {navItems.map((item) => {
          if (item.authRequired && !isLoggedIn) return null;

          const isActive = pathname === item.href;
          const Icon = item.icon;

          return (
            <Link
              key={item.href}
              href={item.href}
              className={`flex flex-col items-center justify-center w-16 h-full transition-colors ${
                isActive ? 'text-blue-600' : 'text-gray-500 hover:text-gray-700'
              }`}
              aria-current={isActive ? 'page' : undefined}
            >
              <Icon className="w-6 h-6" aria-hidden="true" />
              <span className="text-xs mt-1">{item.label}</span>
            </Link>
          );
        })}
      </div>
    </nav>
  );
}
