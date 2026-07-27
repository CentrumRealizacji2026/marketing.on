import Link from "next/link";

import { NAV } from "@/lib/nav";

const sections = NAV.find((category) => category.key === "ustawienia")?.items ?? [];

export default function SettingsLayout({ children }: { children: React.ReactNode }) {
  return (
    <div className="flex flex-col gap-4">
      <div>
        <h1 className="text-xl font-semibold text-ink">Panel zarządzania</h1>
        <p className="mt-1 text-sm text-muted">
          Wszystko, co wpisałeś w kreatorze, zmienisz tutaj. Zmiany obowiązują od dziś w przód —
          historia wcześniejszych dni zostaje nietknięta.
        </p>
      </div>

      <nav className="-mx-1 flex gap-1 overflow-x-auto pb-1">
        {sections.map((item) => (
          <Link
            key={item.href}
            href={item.href}
            className="shrink-0 rounded-lg border border-edge px-3 py-1.5 text-xs text-ink-2 hover:bg-surface-2 hover:text-ink"
          >
            {item.label}
          </Link>
        ))}
      </nav>

      {children}
    </div>
  );
}
