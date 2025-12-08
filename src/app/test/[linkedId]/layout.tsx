/**
 * Layout limpio para la vista de realizar test
 * Sin sidebar del dashboard - pantalla completa para el estudiante
 */
export default function TestLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  return (
    <div className="min-h-screen bg-gray-50">
      {children}
    </div>
  );
}

