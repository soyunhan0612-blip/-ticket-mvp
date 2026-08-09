import type { ReactNode } from "react";

import { Providers } from "@/components/providers";

export default function SellerLayout({ children }: { children: ReactNode }) {
  return (
    <Providers>
      <main className="min-h-screen bg-neutral-950 py-12 sm:py-16">
        {children}
      </main>
    </Providers>
  );
}
