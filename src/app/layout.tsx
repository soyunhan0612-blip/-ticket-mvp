import type { Metadata } from "next";
import { Inter } from "next/font/google";
import Link from "next/link";
import type { ReactNode } from "react";

import { Providers } from "@/components/providers";

import "./globals.css";

/*
 * Vodafone은 독점 서체라 배포본이 없다. DS readme가 지정한 대체 서체가 Inter다.
 * DS tokens/fonts.css의 Google Fonts @import 대신 next/font를 쓴다 —
 * self-host라 렌더 블로킹 외부 요청이 없고, 폰트 메트릭 대체로 CLS가 사라진다.
 */
const inter = Inter({
  subsets: ["latin"],
  weight: ["300", "400", "600", "700", "800"],
  variable: "--font-inter",
  display: "swap",
});

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
    <html className={inter.variable} lang="ko">
      <body className="flex min-h-screen flex-col">
        {/* DS NavBar/Footer는 ink 밴드다. nav(dark) → 콘텐츠 → footer(dark)가 DS의 밴드 리듬 */}
        <nav className="bg-ink text-on-dark">
          <div className="mx-auto flex w-full max-w-7xl items-center justify-between gap-2xl px-lg py-lg sm:px-2xl lg:px-3xl">
            <Link
              className="rounded-sm text-body-md font-extrabold tracking-tight focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-on-dark focus-visible:ring-offset-2 focus-visible:ring-offset-ink"
              href="/"
            >
              티켓 MVP
            </Link>
            <div className="flex items-center gap-2xl">
              <Link
                className="rounded-sm text-body-sm text-mute transition-colors duration-150 hover:text-on-dark focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-on-dark focus-visible:ring-offset-2 focus-visible:ring-offset-ink"
                href="/shows"
              >
                공연
              </Link>
              <Link
                className="rounded-sm text-body-sm text-mute transition-colors duration-150 hover:text-on-dark focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-on-dark focus-visible:ring-offset-2 focus-visible:ring-offset-ink"
                href="/seller/new"
              >
                공연 등록
              </Link>
              <Link
                className="rounded-sm text-body-sm text-mute transition-colors duration-150 hover:text-on-dark focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-on-dark focus-visible:ring-offset-2 focus-visible:ring-offset-ink"
                href="/reservations"
              >
                내 예매
              </Link>
            </div>
          </div>
        </nav>

        <div className="flex-1">
          <Providers>{children}</Providers>
        </div>

        <footer className="bg-ink text-on-dark">
          <div className="mx-auto w-full max-w-7xl space-y-lg px-lg py-3xl sm:px-2xl lg:px-3xl">
            <p className="text-body-md font-extrabold tracking-tight">
              티켓 MVP
            </p>
            <p className="max-w-xl text-body-sm text-mute">
              포트폴리오용 티켓 예매 서비스입니다. 실제 결제나 발권은 이루어지지
              않습니다.
            </p>
          </div>
        </footer>
      </body>
    </html>
  );
}
