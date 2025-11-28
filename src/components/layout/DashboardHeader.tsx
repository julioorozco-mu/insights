"use client";

interface DashboardHeaderProps {
  title: React.ReactNode;
  description?: string;
  action?: React.ReactNode;
}

export function DashboardHeader({ title, description, action }: DashboardHeaderProps) {
  return (
    <div className="flex justify-between items-start mb-8">
      <div>
        <h1 className="text-4xl font-bold mb-2">{title}</h1>
        {description && <p className="text-base-content/70">{description}</p>}
      </div>
      {action && <div>{action}</div>}
    </div>
  );
}
