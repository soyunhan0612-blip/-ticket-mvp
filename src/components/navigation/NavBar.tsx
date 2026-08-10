import Link from "next/link";
import type { JSX } from "react";

const NAV_LINK_CLASS_NAMES =
  "whitespace-nowrap rounded-sm text-body-sm text-mute transition-colors duration-150 hover:text-on-dark focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-on-dark focus-visible:ring-offset-2 focus-visible:ring-offset-ink";

const NAV_ITEMS = [
  { href: "/shows", label: "공연" },
  { href: "/seller/new", label: "공연 등록" },
  { href: "/reservations", label: "내 예매" },
] as const;

export function NavBar(): JSX.Element {
  return (
    <nav aria-label="주요 메뉴" className="bg-ink text-on-dark">
      <div className="mx-auto flex w-full max-w-7xl flex-col items-start gap-lg px-lg py-lg sm:flex-row sm:items-center sm:justify-between sm:gap-2xl sm:px-2xl lg:px-3xl">
        <Link
          className="whitespace-nowrap rounded-sm text-body-md font-extrabold tracking-tight focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-on-dark focus-visible:ring-offset-2 focus-visible:ring-offset-ink"
          href="/"
        >
          티켓 MVP
        </Link>

        <ul className="flex w-full items-center justify-between gap-lg sm:w-auto sm:justify-start sm:gap-2xl">
          {NAV_ITEMS.map((item) => (
            <li key={item.href}>
              <Link className={NAV_LINK_CLASS_NAMES} href={item.href}>
                {item.label}
              </Link>
            </li>
          ))}
        </ul>
      </div>
    </nav>
  );
}
