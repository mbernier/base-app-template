'use client';

import { AdminGuard } from '@/components/admin/AdminGuard';
import { AdminNav } from '@/components/admin/AdminNav';

export default function AdminLayout({ children }: { children: React.ReactNode }): React.ReactElement {
  return (
    <AdminGuard>
      <div className="flex flex-col md:flex-row min-h-[calc(100vh-64px)]">
        <AdminNav />
        <div className="flex-1 p-6">{children}</div>
      </div>
    </AdminGuard>
  );
}
