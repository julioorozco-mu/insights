'use client';

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
