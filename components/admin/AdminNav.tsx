'use client';

import Link from 'next/link';
import { usePathname } from 'next/navigation';
import { useAdmin } from '@/hooks/useAdmin';

const navItems = [
  { href: '/admin', label: 'Dashboard' },
  { href: '/admin/collections', label: 'Collections' },
  { href: '/admin/settings', label: 'Settings' },
];

const superAdminItems = [
  { href: '/admin/users', label: 'Users' },
];

export function AdminNav(): React.ReactElement {
  const pathname = usePathname();
  const { isSuperAdmin } = useAdmin();

  const allItems = [...navItems, ...(isSuperAdmin ? superAdminItems : [])];

  return (
    <nav className="w-full md:w-56 bg-gray-50 border-r border-gray-200 p-4" aria-label="Admin navigation">
      <h2 className="text-sm font-semibold text-gray-500 uppercase tracking-wider mb-4">
        Admin
      </h2>
      <ul className="space-y-1">
        {allItems.map((item) => {
          const isActive = pathname === item.href ||
            (item.href !== '/admin' && pathname.startsWith(item.href));

          return (
            <li key={item.href}>
              <Link
                href={item.href}
                className={`block px-3 py-2 rounded-lg text-sm font-medium transition-colors min-h-[44px] flex items-center ${
                  isActive
                    ? 'bg-blue-100 text-blue-800'
                    : 'text-gray-700 hover:bg-gray-100'
                }`}
              >
                {item.label}
              </Link>
            </li>
          );
        })}
      </ul>
    </nav>
  );
}
