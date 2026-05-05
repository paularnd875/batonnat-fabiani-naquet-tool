'use client';

import { useEffect, useState } from 'react';

export default function HydrationFix({ children }: { children: React.ReactNode }) {
  const [mounted, setMounted] = useState(false);

  useEffect(() => {
    // Forcer le montage côté client pour éviter les erreurs d'hydratation
    setMounted(true);
  }, []);

  // Pendant l'hydratation, rendre uniquement côté client
  if (!mounted) {
    return (
      <div className="min-h-screen bg-white">
        <div className="flex items-center justify-center min-h-screen">
          <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-blue-600"></div>
        </div>
      </div>
    );
  }

  return <>{children}</>;
}