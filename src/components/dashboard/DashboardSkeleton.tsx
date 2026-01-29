"use client";

/**
 * Dashboard Skeleton - Loading state for the dashboard
 * Matches the exact layout of the dashboard for smooth transition
 */
export function DashboardSkeleton() {
    return (
        <div className="mx-auto flex max-w-7xl flex-col gap-8 animate-pulse">
            <div className="flex flex-col gap-8 lg:flex-row">
                <div className="flex-1 space-y-8">
                    {/* Skeleton for recommended courses */}
                    <section>
                        <div className="mb-4 h-7 w-64 rounded bg-slate-200" />
                        <div className="grid gap-6 md:grid-cols-2">
                            {[1, 2, 3, 4].map((i) => (
                                <div key={i} className="h-80 rounded-2xl bg-slate-200" />
                            ))}
                        </div>
                    </section>
                    {/* Skeleton for my courses */}
                    <section>
                        <div className="mb-4 h-7 w-32 rounded bg-slate-200" />
                        <div className="space-y-4">
                            {[1, 2, 3].map((i) => (
                                <div key={i} className="h-20 rounded-2xl bg-slate-200" />
                            ))}
                        </div>
                    </section>
                </div>
                <div className="w-full space-y-6 lg:max-w-sm">
                    <div className="h-96 rounded-3xl bg-slate-200" />
                    <div className="h-32 rounded-3xl bg-slate-200" />
                    <div className="h-48 rounded-3xl bg-slate-200" />
                </div>
            </div>
        </div>
    );
}
