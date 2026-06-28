import type { Metadata, Viewport } from "next";
import { Geist, Geist_Mono } from "next/font/google";
import "./globals.css";
import { BottomNav } from "./components/BottomNav";

const geistSans = Geist({
  variable: "--font-geist-sans",
  subsets: ["latin"],
});

const geistMono = Geist_Mono({
  variable: "--font-geist-mono",
  subsets: ["latin"],
});

export const metadata: Metadata = {
  title: "로또 트래커",
  description: "회차별 구매·당첨 관리와 분석",
};

export const viewport: Viewport = {
  width: "device-width",
  initialScale: 1,
  viewportFit: "cover", // 노치/홈 인디케이터 영역까지 렌더 → safe-area-inset 적용
  themeColor: "#ffffff",
};

export default function RootLayout({
  children,
}: Readonly<{
  children: React.ReactNode;
}>) {
  return (
    <html
      lang="ko"
      className={`${geistSans.variable} ${geistMono.variable} h-full antialiased`}
    >
      <body className="min-h-full flex flex-col bg-neutral-50 text-neutral-900">
        <header className="pt-safe sticky top-0 z-40 border-b border-neutral-200 bg-white/95 backdrop-blur">
          <nav className="mx-auto flex max-w-4xl items-center gap-x-5 px-4 py-3">
            <a href="/" className="text-lg font-bold">
              🎯 로또 트래커
            </a>
            {/* 데스크톱 메뉴 (모바일은 하단 탭바로 대체) */}
            <div className="hidden items-center gap-x-5 sm:flex">
              <a
                href="/"
                className="text-sm text-neutral-600 hover:text-neutral-900"
              >
                대시보드
              </a>
              <a
                href="/purchases"
                className="text-sm text-neutral-600 hover:text-neutral-900"
              >
                내 구매
              </a>
              <a
                href="/stores"
                className="text-sm text-neutral-600 hover:text-neutral-900"
              >
                판매점
              </a>
              <a
                href="/draws"
                className="text-sm text-neutral-600 hover:text-neutral-900"
              >
                당첨번호
              </a>
              <a
                href="/analysis"
                className="text-sm text-neutral-600 hover:text-neutral-900"
              >
                분석
              </a>
              <a
                href="/winning-stores"
                className="text-sm text-neutral-600 hover:text-neutral-900"
              >
                명당
              </a>
            </div>
            <a
              href="/purchases/new"
              className="ml-auto rounded-lg bg-blue-600 px-3 py-2 text-sm font-medium text-white active:bg-blue-700"
            >
              + 구매 등록
            </a>
          </nav>
        </header>
        <main className="mx-auto w-full max-w-4xl flex-1 px-4 py-6 pb-[calc(5rem+env(safe-area-inset-bottom))] sm:pb-6">
          {children}
        </main>
        <BottomNav />
      </body>
    </html>
  );
}
