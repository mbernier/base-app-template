import Link from 'next/link';
import { app } from '@/lib/config';

interface FooterProps {
  className?: string;
}

export function Footer({ className }: FooterProps) {
  const currentYear = new Date().getFullYear();

  return (
    <footer className={`bg-gray-50 border-t border-gray-200 ${className || ''}`}>
      <div className="max-w-7xl mx-auto px-4 py-8">
        <div className="flex flex-col md:flex-row justify-between items-center gap-4">
          {/* Copyright */}
          <p className="text-sm text-gray-500">
            {currentYear} {app.name}. All rights reserved.
          </p>

          {/* Legal Links */}
          <nav className="flex items-center gap-6" aria-label="Footer navigation">
            <Link
              href="/terms"
              className="text-sm text-gray-500 hover:text-gray-700 transition-colors"
            >
              Terms of Service
            </Link>
            <Link
              href="/privacy"
              className="text-sm text-gray-500 hover:text-gray-700 transition-colors"
            >
              Privacy Policy
            </Link>
          </nav>
        </div>
      </div>
    </footer>
  );
}
