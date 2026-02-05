'use client';

/**
 * Skeleton de carga para el tab Overview
 */
export function OverviewTabSkeleton() {
  return (
    <div className="max-w-4xl animate-pulse">
      {/* Title skeleton */}
      <div className="h-8 bg-gray-200 rounded w-2/3 mb-4"></div>

      {/* Description skeleton */}
      <div className="space-y-2 mb-8">
        <div className="h-4 bg-gray-200 rounded w-full"></div>
        <div className="h-4 bg-gray-200 rounded w-5/6"></div>
        <div className="h-4 bg-gray-200 rounded w-4/6"></div>
      </div>

      {/* Resources section skeleton */}
      <div className="mt-8">
        <div className="h-6 bg-gray-200 rounded w-48 mb-4"></div>
        {[1, 2].map((i) => (
          <div key={i} className="flex items-center gap-3 p-4 rounded-lg border border-gray-200 mb-3">
            <div className="w-8 h-8 bg-gray-200 rounded"></div>
            <div className="flex-1">
              <div className="h-4 bg-gray-200 rounded w-1/3 mb-2"></div>
              <div className="h-3 bg-gray-200 rounded w-16"></div>
            </div>
          </div>
        ))}
      </div>
    </div>
  );
}

/**
 * Skeleton de carga para los tabs de Q&A y Notas
 */
export function TabSkeleton() {
  return (
    <div className="space-y-4 animate-pulse">
      {/* Input skeleton */}
      <div className="card bg-base-200">
        <div className="card-body">
          <div className="h-4 bg-base-300 rounded w-1/4 mb-4"></div>
          <div className="h-20 bg-base-300 rounded"></div>
          <div className="flex justify-end mt-4">
            <div className="h-10 bg-base-300 rounded w-24"></div>
          </div>
        </div>
      </div>

      {/* Items skeleton */}
      {[1, 2, 3].map((i) => (
        <div key={i} className="card bg-base-100 border">
          <div className="card-body">
            <div className="flex gap-3">
              <div className="w-10 h-10 bg-base-300 rounded-full"></div>
              <div className="flex-1">
                <div className="h-4 bg-base-300 rounded w-1/3 mb-2"></div>
                <div className="h-3 bg-base-300 rounded w-full mb-1"></div>
                <div className="h-3 bg-base-300 rounded w-2/3"></div>
              </div>
            </div>
          </div>
        </div>
      ))}
    </div>
  );
}
