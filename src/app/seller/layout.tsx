import type { ReactNode } from "react";

import { Band } from "@/components/ui/Band";

export default function SellerLayout({
  children,
}: Readonly<{
  children: ReactNode;
}>) {
  return (
    <main>
      <Band fill tone="light" width="tool">
        {children}
      </Band>
    </main>
  );
}
