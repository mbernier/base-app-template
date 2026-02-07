import Link from 'next/link';
import { Button } from '@/components/ui/Button';

/**
 * 404 Not Found page with a friendly message.
 */
export default function NotFound() {
  return (
    <div className="container-page flex items-center justify-center min-h-[60vh]">
      <div className="text-center max-w-md">
        <div className="text-8xl font-bold text-gray-200 mb-4 select-none" aria-hidden="true">
          404
        </div>
        <h1 className="text-2xl font-bold text-gray-900 mb-2">Page not found</h1>
        <p className="text-gray-600 mb-6">
          Looks like this page went off-chain. The page you are looking for does not exist or has
          been moved.
        </p>
        <Link href="/">
          <Button>Back to Home</Button>
        </Link>
      </div>
    </div>
  );
}
