/**
 * Root loading state shown during route transitions.
 * Uses skeleton UI for a smooth loading experience.
 */
export default function Loading() {
  return (
    <div className="container-page animate-pulse" aria-busy="true" aria-label="Loading content">
      {/* Header skeleton */}
      <div className="mb-8">
        <div className="h-8 bg-gray-200 rounded-lg w-48 mb-3" />
        <div className="h-4 bg-gray-200 rounded w-96 max-w-full" />
      </div>

      {/* Content skeleton - card grid */}
      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
        {Array.from({ length: 3 }).map((_, i) => (
          <div key={i} className="card p-6">
            <div className="h-4 bg-gray-200 rounded w-3/4 mb-4" />
            <div className="h-3 bg-gray-200 rounded w-full mb-2" />
            <div className="h-3 bg-gray-200 rounded w-5/6 mb-4" />
            <div className="h-10 bg-gray-200 rounded-lg w-32" />
          </div>
        ))}
      </div>
    </div>
  );
}
