import type { ReactNode } from "react";

export default function SellerLayout({
  children,
}: Readonly<{
  children: ReactNode;
}>) {
  return (
    <main className="min-h-screen bg-neutral-950 py-12 sm:py-16">
      {children}
    </main>
  );
}
