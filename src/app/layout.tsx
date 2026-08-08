import type { Metadata } from "next";
import Link from "next/link";
import type { ReactNode } from "react";

import { Providers } from "@/components/providers";

import "./globals.css";

export const metadata: Metadata = {
  title: "티켓 MVP",
  description: "티켓링크형 예매 서비스 포트폴리오 MVP",
};

export default function RootLayout({
  children,
}: Readonly<{
  children: ReactNode;
}>) {
  return (
    <html lang="ko">
      <body>
        <nav className="border-b border-neutral-800 bg-neutral-950">
          <div className="mx-auto flex w-full max-w-5xl items-center justify-between px-4 py-3 sm:px-6 lg:px-8">
            <Link
              className="text-sm font-semibold text-white hover:text-neutral-200"
              href="/shows"
            >
              티켓 MVP
            </Link>
            <Link
              className="text-sm text-neutral-400 hover:text-white"
              href="/reservations"
            >
              내 예매
            </Link>
          </div>
        </nav>
        <Providers>{children}</Providers>
      </body>
    </html>
  );
}
