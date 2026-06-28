"use client";

import { usePathname } from "next/navigation";

// 모바일 전용 하단 탭바. 엄지로 닿는 위치에 주요 메뉴를 고정한다.
const TABS = [
  { href: "/", label: "홈", icon: "🏠" },
  { href: "/purchases", label: "구매", icon: "🎟️" },
  { href: "/draws", label: "당첨", icon: "🎯" },
  { href: "/analysis", label: "분석", icon: "📊" },
  { href: "/winning-stores", label: "명당", icon: "📍" },
  { href: "/stores", label: "판매점", icon: "🏪" },
];

function isActive(pathname: string, href: string): boolean {
  if (href === "/") return pathname === "/";
  return pathname === href || pathname.startsWith(href + "/");
}

export function BottomNav() {
  const pathname = usePathname();
  return (
    <nav className="pb-safe fixed inset-x-0 bottom-0 z-40 border-t border-neutral-200 bg-white/95 backdrop-blur sm:hidden">
      <ul className="mx-auto flex max-w-4xl">
        {TABS.map((t) => {
          const active = isActive(pathname, t.href);
          return (
            <li key={t.href} className="flex-1">
              <a
                href={t.href}
                aria-current={active ? "page" : undefined}
                className={`flex h-14 flex-col items-center justify-center gap-0.5 text-[11px] font-medium transition-colors ${
                  active ? "text-blue-600" : "text-neutral-400"
                }`}
              >
                <span className="text-lg leading-none">{t.icon}</span>
                {t.label}
              </a>
            </li>
          );
        })}
      </ul>
    </nav>
  );
}
